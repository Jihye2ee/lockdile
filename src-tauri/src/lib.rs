use std::path::PathBuf;
use std::str::FromStr;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Arc, Mutex};
use std::time::Duration;

use core_foundation::runloop::CFRunLoop;
use core_graphics::event::{
    CGEventFlags, CGEventTap, CGEventTapLocation, CGEventTapOptions, CGEventTapPlacement,
    CGEventType, CallbackResult,
};
use serde::{Deserialize, Serialize};
use tauri::menu::{Menu, MenuItem};
use tauri::tray::TrayIconBuilder;
use tauri::{ActivationPolicy, AppHandle, Emitter, Manager, State, Wry};
use tauri_plugin_autostart::ManagerExt;
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};

#[derive(Clone, Copy, PartialEq, Eq)]
enum Guard {
    Off,
    Arming,
    Armed,
    Triggered,
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Settings {
    hotkey: String,
    grace_secs: u64,
    bite_ms: u64,
    #[serde(default)]
    start_at_login: bool,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            hotkey: "control+alt+KeyG".into(),
            grace_secs: 3,
            bite_ms: 2600,
            start_at_login: false,
        }
    }
}

#[derive(Clone, Serialize)]
struct Bite {
    x: f64,
    y: f64,
}

struct Shared {
    guard: Mutex<Guard>,
    // 진행 중인 arm/trigger 타이머를 무효화하기 위한 세대 카운터 (오래된 타이머가 새 상태를 덮어쓰는 race 방지)
    generation: AtomicU64,
    tray: Mutex<Option<tauri::tray::TrayIcon<Wry>>>,
    toggle_item: Mutex<Option<MenuItem<Wry>>>,
    settings: Mutex<Settings>,
    current_shortcut: Mutex<Option<Shortcut>>,
}

impl Shared {
    fn new() -> Self {
        Shared {
            guard: Mutex::new(Guard::Off),
            generation: AtomicU64::new(0),
            tray: Mutex::new(None),
            toggle_item: Mutex::new(None),
            settings: Mutex::new(Settings::default()),
            current_shortcut: Mutex::new(None),
        }
    }
}

fn update_ui(app: &AppHandle, shared: &Arc<Shared>, g: Guard) {
    let (title, toggle_text) = match g {
        Guard::Off => ("🐊", "가드 켜기"),
        Guard::Arming => ("🐊⏳", "가드 끄기"),
        Guard::Armed => ("🐊🛡️", "가드 끄기"),
        Guard::Triggered => ("🐊🔒", "가드 끄기"),
    };
    let label = match g {
        Guard::Off => "off",
        Guard::Arming => "arming",
        Guard::Armed => "armed",
        Guard::Triggered => "triggered",
    };
    let _ = app.emit("guard-state", label);

    // NSStatusItem/NSMenuItem 은 메인 스레드에서만 변경 가능 (타이머/rdev 스레드에서 호출 시 SIGTRAP)
    let shared2 = shared.clone();
    let _ = app.run_on_main_thread(move || {
        if let Some(tray) = shared2.tray.lock().unwrap().as_ref() {
            let _ = tray.set_title(Some(title));
        }
        if let Some(item) = shared2.toggle_item.lock().unwrap().as_ref() {
            let _ = item.set_text(toggle_text);
        }
    });
}

fn set_guard(app: &AppHandle, shared: &Arc<Shared>, new: Guard) {
    *shared.guard.lock().unwrap() = new;
    update_ui(app, shared, new);
}

fn arm(app: &AppHandle, shared: &Arc<Shared>) {
    let gen = shared.generation.fetch_add(1, Ordering::SeqCst) + 1;
    let grace = shared.settings.lock().unwrap().grace_secs;
    set_guard(app, shared, Guard::Arming);

    let app2 = app.clone();
    let shared2 = shared.clone();
    std::thread::spawn(move || {
        std::thread::sleep(Duration::from_secs(grace));
        if shared2.generation.load(Ordering::SeqCst) == gen
            && *shared2.guard.lock().unwrap() == Guard::Arming
        {
            set_guard(&app2, &shared2, Guard::Armed);
        }
    });
}

fn disarm(app: &AppHandle, shared: &Arc<Shared>) {
    shared.generation.fetch_add(1, Ordering::SeqCst);
    set_guard(app, shared, Guard::Off);
}

fn toggle(app: &AppHandle, shared: &Arc<Shared>) {
    let cur = *shared.guard.lock().unwrap();
    match cur {
        Guard::Off => arm(app, shared),
        _ => disarm(app, shared),
    }
}

fn lock_screen() {
    // macOS 비공개 프레임워크 login.framework 의 SACLockScreenImmediate 로 즉시 잠금 (공개 API 없음)
    unsafe {
        if let Ok(lib) =
            libloading::Library::new("/System/Library/PrivateFrameworks/login.framework/login")
        {
            let func: Result<libloading::Symbol<unsafe extern "C" fn() -> i32>, _> =
                lib.get(b"SACLockScreenImmediate");
            if let Ok(f) = func {
                f();
                return;
            }
        }
    }
    // 폴백: FFI 실패 시 디스플레이 슬립 ("즉시 암호 요구" 설정이 켜져 있어야 실제 잠김)
    let _ = std::process::Command::new("pmset")
        .arg("displaysleepnow")
        .status();
}

fn trigger(app: &AppHandle, shared: &Arc<Shared>) {
    {
        let mut g = shared.guard.lock().unwrap();
        if *g != Guard::Armed {
            return;
        }
        *g = Guard::Triggered;
    }
    shared.generation.fetch_add(1, Ordering::SeqCst);
    update_ui(app, shared, Guard::Triggered);

    let app_show = app.clone();
    let _ = app.run_on_main_thread(move || {
        let mut bite = Bite { x: -1.0, y: -1.0 };
        if let Some(win) = app_show.get_webview_window("main") {
            if let Ok(Some(monitor)) = win.current_monitor() {
                let size = *monitor.size();
                let pos = *monitor.position();
                let scale = monitor.scale_factor();
                let _ = win.set_size(tauri::PhysicalSize::new(size.width, size.height));
                let _ = win.set_position(tauri::PhysicalPosition::new(pos.x, pos.y));
                if let Ok(cur) = app_show.cursor_position() {
                    bite.x = (cur.x - pos.x as f64) / scale;
                    bite.y = (cur.y - pos.y as f64) / scale;
                }
            }
            let _ = win.set_always_on_top(true);
            let _ = win.show();
            let _ = win.set_focus();
        }
        let _ = app_show.emit("intruder", bite);
    });

    let app2 = app.clone();
    let shared2 = shared.clone();
    let bite_ms = shared.settings.lock().unwrap().bite_ms;
    std::thread::spawn(move || {
        std::thread::sleep(Duration::from_millis(bite_ms));
        lock_screen();
        let app_hide = app2.clone();
        let _ = app2.run_on_main_thread(move || {
            if let Some(win) = app_hide.get_webview_window("main") {
                let _ = win.hide();
            }
        });
        // 트리거 후 반드시 OFF: 해제 안 하면 잠금 해제→타이핑→재잠금 무한루프가 됨
        set_guard(&app2, &shared2, Guard::Off);
    });
}

fn start_listener(app: AppHandle, shared: Arc<Shared>) {
    std::thread::spawn(move || {
        let result = CGEventTap::with_enabled(
            CGEventTapLocation::Session,
            CGEventTapPlacement::HeadInsertEventTap,
            CGEventTapOptions::ListenOnly,
            vec![CGEventType::KeyDown],
            |_proxy, _etype, event| {
                // ⌃/⌥/⌘ 조합은 주인의 해제용이므로 트리거 제외, 일반 키만 침입자로 판정
                let combo = event.get_flags().intersects(
                    CGEventFlags::CGEventFlagControl
                        | CGEventFlags::CGEventFlagAlternate
                        | CGEventFlags::CGEventFlagCommand,
                );
                if !combo && *shared.guard.lock().unwrap() == Guard::Armed {
                    trigger(&app, &shared);
                }
                CallbackResult::Keep
            },
            || CFRunLoop::run_current(),
        );
        if result.is_err() {
            eprintln!("[lockdile] event tap 생성 실패 (손쉬운 사용/입력 모니터링 권한 확인)");
        }
    });
}

fn register_hotkey(app: &AppHandle, shared: &Arc<Shared>, hotkey: &str) -> Result<(), String> {
    let gs = app.global_shortcut();
    if let Some(old) = shared.current_shortcut.lock().unwrap().take() {
        let _ = gs.unregister(old);
    }
    let sc = Shortcut::from_str(hotkey).map_err(|e| format!("{e}"))?;
    gs.on_shortcut(sc, move |app, _sc, event| {
        if event.state() == ShortcutState::Pressed {
            let shared = app.state::<Arc<Shared>>();
            toggle(app, shared.inner());
        }
    })
    .map_err(|e| e.to_string())?;
    *shared.current_shortcut.lock().unwrap() = Some(sc);
    Ok(())
}

fn settings_path(app: &AppHandle) -> Option<PathBuf> {
    app.path()
        .app_config_dir()
        .ok()
        .map(|d| d.join("settings.json"))
}

fn load_settings(app: &AppHandle) -> Settings {
    if let Some(p) = settings_path(app) {
        if let Ok(text) = std::fs::read_to_string(&p) {
            if let Ok(cfg) = serde_json::from_str(&text) {
                return cfg;
            }
        }
    }
    Settings::default()
}

fn persist_settings(app: &AppHandle, s: &Settings) {
    if let Some(p) = settings_path(app) {
        if let Some(dir) = p.parent() {
            let _ = std::fs::create_dir_all(dir);
        }
        let _ = std::fs::write(&p, serde_json::to_string_pretty(s).unwrap_or_default());
    }
}

#[tauri::command]
fn get_settings(app: AppHandle, shared: State<Arc<Shared>>) -> Settings {
    let mut s = shared.settings.lock().unwrap().clone();
    if let Ok(enabled) = app.autolaunch().is_enabled() {
        s.start_at_login = enabled;
    }
    s
}

#[tauri::command]
fn save_settings(
    app: AppHandle,
    shared: State<Arc<Shared>>,
    settings: Settings,
) -> Result<(), String> {
    Shortcut::from_str(&settings.hotkey).map_err(|e| format!("잘못된 단축키: {e}"))?;
    *shared.settings.lock().unwrap() = settings.clone();
    persist_settings(&app, &settings);

    let _ = if settings.start_at_login {
        app.autolaunch().enable()
    } else {
        app.autolaunch().disable()
    };

    let app2 = app.clone();
    let shared2 = shared.inner().clone();
    let hotkey = settings.hotkey.clone();
    let _ = app.run_on_main_thread(move || {
        let _ = register_hotkey(&app2, &shared2, &hotkey);
    });
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let shared = Arc::new(Shared::new());

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None::<Vec<&str>>,
        ))
        .manage(shared.clone())
        .on_window_event(|window, event| {
            if window.label() == "settings" {
                if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                    api.prevent_close();
                    let _ = window.hide();
                }
            }
        })
        .invoke_handler(tauri::generate_handler![get_settings, save_settings])
        .setup(move |app| {
            app.set_activation_policy(ActivationPolicy::Accessory);

            let handle = app.handle().clone();

            *shared.settings.lock().unwrap() = load_settings(&handle);

            let toggle_i = MenuItem::with_id(app, "toggle", "가드 켜기", true, None::<&str>)?;
            let settings_i = MenuItem::with_id(app, "settings", "설정…", true, None::<&str>)?;
            let quit_i = MenuItem::with_id(app, "quit", "종료", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&toggle_i, &settings_i, &quit_i])?;

            let tray = TrayIconBuilder::new()
                .title("🐊")
                .menu(&menu)
                .on_menu_event(|app, event| {
                    let shared = app.state::<Arc<Shared>>();
                    match event.id.as_ref() {
                        "toggle" => toggle(app, shared.inner()),
                        "settings" => {
                            if let Some(w) = app.get_webview_window("settings") {
                                let _ = w.show();
                                let _ = w.set_focus();
                            }
                        }
                        "quit" => app.exit(0),
                        _ => {}
                    }
                })
                .build(app)?;

            *shared.tray.lock().unwrap() = Some(tray);
            *shared.toggle_item.lock().unwrap() = Some(toggle_i);

            let hotkey = shared.settings.lock().unwrap().hotkey.clone();
            if let Err(e) = register_hotkey(&handle, &shared, &hotkey) {
                eprintln!("[lockdile] hotkey register failed ({hotkey}): {e}");
            }

            start_listener(handle, shared.clone());

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
