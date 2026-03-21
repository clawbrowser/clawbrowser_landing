# Plan 2: libclaw (Rust FFI Library) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Rust library (libclaw) that manages fingerprint profiles, shared memory, proxy credentials, and exposes a C FFI for Chromium integration.

**Architecture:** A Rust library compiled as a C-compatible shared library (`.dylib` on macOS). It reads fingerprint profiles from disk, writes them into POSIX shared memory for Chromium sub-processes, and provides C-callable functions for profile management, proxy credential access, and seed-based noise generation.

**Tech Stack:** Rust 2021 edition, `libc` crate for POSIX shm, `serde` + `serde_json` for profile serialization, `cbindgen` for C header generation

**Spec:** `docs/superpowers/specs/2026-03-21-clawbrowser-design.md`

**Depends on:** Plan 1 (backend API) defines the fingerprint JSON schema. libclaw must parse the same `GenerateResponse` format.

---

## File Structure

```
libclaw/
├── Cargo.toml
├── cbindgen.toml                    # Config for C header generation
├── src/
│   ├── lib.rs                       # FFI entry points (extern "C" functions)
│   ├── profile.rs                   # Profile loading/saving from disk
│   ├── profile_test.rs              # Profile tests
│   ├── shm.rs                       # POSIX shared memory management
│   ├── shm_test.rs                  # Shared memory tests
│   ├── types.rs                     # Fingerprint, ProxyConfig, Screen, etc. (mirrors backend model)
│   ├── noise.rs                     # Seed-based deterministic noise generation (canvas, audio, client_rects)
│   ├── noise_test.rs                # Noise generation tests
│   ├── api_client.rs                # HTTP client for backend fingerprint API
│   ├── api_client_test.rs           # API client tests
│   └── config.rs                    # Config loading (API key from env/config.json)
├── tests/
│   └── integration.rs               # Integration tests (profile → shm → read back)
└── include/
    └── libclaw.h                    # Auto-generated C header (via cbindgen)
```

---

### Task 1: Project Scaffold and Types

**Files:**
- Create: `libclaw/Cargo.toml`
- Create: `libclaw/src/lib.rs`
- Create: `libclaw/src/types.rs`

- [ ] **Step 1: Create Cargo.toml**

Create `libclaw/Cargo.toml`:

```toml
[package]
name = "libclaw"
version = "0.1.0"
edition = "2021"

[lib]
crate-type = ["cdylib", "rlib"]

[dependencies]
serde = { version = "1", features = ["derive"] }
serde_json = "1"
libc = "0.2"
reqwest = { version = "0.12", features = ["blocking", "json"] }

[dev-dependencies]
tempfile = "3"

[build-dependencies]
cbindgen = "0.27"
```

- [ ] **Step 2: Create types matching backend API response**

Create `libclaw/src/types.rs`:

```rust
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProfileOnDisk {
    pub schema_version: u32,
    pub created_at: String,
    pub request: GenerateRequest,
    pub fingerprint: Fingerprint,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub proxy: Option<ProxyConfig>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GenerateRequest {
    pub platform: String,
    pub browser: String,
    pub country: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub city: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub connection_type: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GenerateResponse {
    pub fingerprint: Fingerprint,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub proxy: Option<ProxyConfig>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Fingerprint {
    pub user_agent: String,
    pub platform: String,
    pub screen: Screen,
    pub hardware: Hardware,
    pub webgl: WebGL,
    pub canvas_seed: i64,
    pub audio_seed: i64,
    pub client_rects_seed: i64,
    pub timezone: String,
    pub language: Vec<String>,
    pub fonts: Vec<String>,
    #[serde(default)]
    pub media_devices: Vec<MediaDevice>,
    #[serde(default)]
    pub plugins: Vec<Plugin>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub battery: Option<Battery>,
    #[serde(default)]
    pub speech_voices: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Screen {
    pub width: i32,
    pub height: i32,
    pub avail_width: i32,
    pub avail_height: i32,
    pub color_depth: i32,
    pub pixel_ratio: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Hardware {
    pub concurrency: i32,
    pub memory: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WebGL {
    pub vendor: String,
    pub renderer: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MediaDevice {
    pub kind: String,
    pub label: String,
    pub device_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Plugin {
    pub name: String,
    pub description: String,
    pub filename: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Battery {
    pub charging: bool,
    pub level: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProxyConfig {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub country: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub city: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub connection_type: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub host: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub port: Option<u16>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub username: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub password: Option<String>,
}

/// Flat C-compatible struct for shared memory layout.
/// Fixed-size fields only — strings are stored as byte arrays.
#[repr(C)]
pub struct ShmFingerprint {
    pub magic: u32,                    // 0x434C4157 ("CLAW")
    pub version: u32,
    pub canvas_seed: i64,
    pub audio_seed: i64,
    pub client_rects_seed: i64,
    pub screen_width: i32,
    pub screen_height: i32,
    pub screen_avail_width: i32,
    pub screen_avail_height: i32,
    pub screen_color_depth: i32,
    pub screen_pixel_ratio: f64,
    pub hardware_concurrency: i32,
    pub hardware_memory: i32,
    pub user_agent: [u8; 512],
    pub platform: [u8; 64],
    pub timezone: [u8; 64],
    pub webgl_vendor: [u8; 128],
    pub webgl_renderer: [u8; 256],
    pub language_json: [u8; 512],      // JSON-encoded language array
    pub fonts_json: [u8; 4096],        // JSON-encoded fonts array
    pub proxy_host: [u8; 256],
    pub proxy_port: u16,
    pub proxy_username: [u8; 128],
    pub proxy_password: [u8; 128],
    pub has_proxy: u8,
    pub battery_charging: u8,
    pub battery_level: f64,
    pub has_battery: u8,
}

pub const SHM_MAGIC: u32 = 0x434C4157; // "CLAW"
pub const SHM_VERSION: u32 = 1;
```

- [ ] **Step 3: Create minimal lib.rs**

Create `libclaw/src/lib.rs`:

```rust
pub mod types;
pub mod profile;
pub mod shm;
pub mod noise;
pub mod api_client;
pub mod config;
```

- [ ] **Step 4: Verify it compiles**

```bash
cd libclaw && cargo check
```

Expected: compiles with no errors (warnings about unused modules are ok).

- [ ] **Step 5: Commit**

```bash
git add libclaw/
git commit -m "feat(libclaw): scaffold Rust project with types matching API schema"
```

---

### Task 2: Profile Manager

**Files:**
- Create: `libclaw/src/profile.rs`

- [ ] **Step 1: Write the failing tests**

Add to `libclaw/src/profile.rs`:

```rust
use std::fs;
use std::path::{Path, PathBuf};

use crate::types::{ProfileOnDisk, GenerateRequest, GenerateResponse};

pub struct ProfileManager {
    browser_dir: PathBuf,
}

// Implementation will go here after tests

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::*;
    use tempfile::TempDir;

    fn sample_profile() -> ProfileOnDisk {
        ProfileOnDisk {
            schema_version: 1,
            created_at: "2026-03-21T14:30:00Z".to_string(),
            request: GenerateRequest {
                platform: "macos".to_string(),
                browser: "chrome".to_string(),
                country: "US".to_string(),
                city: Some("NYC".to_string()),
                connection_type: Some("residential".to_string()),
            },
            fingerprint: Fingerprint {
                user_agent: "Mozilla/5.0 Test".to_string(),
                platform: "MacIntel".to_string(),
                screen: Screen {
                    width: 1920, height: 1080,
                    avail_width: 1920, avail_height: 1055,
                    color_depth: 24, pixel_ratio: 2.0,
                },
                hardware: Hardware { concurrency: 8, memory: 16 },
                webgl: WebGL { vendor: "Apple".to_string(), renderer: "Apple M2".to_string() },
                canvas_seed: 12345,
                audio_seed: 67890,
                client_rects_seed: 11111,
                timezone: "America/New_York".to_string(),
                language: vec!["en-US".to_string(), "en".to_string()],
                fonts: vec!["Arial".to_string(), "Helvetica".to_string()],
                media_devices: vec![],
                plugins: vec![],
                battery: Some(Battery { charging: true, level: 0.87 }),
                speech_voices: vec![],
            },
            proxy: None,
        }
    }

    #[test]
    fn test_save_and_load_profile() {
        let tmp = TempDir::new().unwrap();
        let mgr = ProfileManager::new(tmp.path().to_path_buf());

        let profile = sample_profile();
        mgr.save("fp_test1", &profile).unwrap();
        let loaded = mgr.load("fp_test1").unwrap();

        assert_eq!(loaded.fingerprint.user_agent, "Mozilla/5.0 Test");
        assert_eq!(loaded.schema_version, 1);
    }

    #[test]
    fn test_profile_exists() {
        let tmp = TempDir::new().unwrap();
        let mgr = ProfileManager::new(tmp.path().to_path_buf());

        assert!(!mgr.exists("fp_nonexistent"));

        mgr.save("fp_exists", &sample_profile()).unwrap();
        assert!(mgr.exists("fp_exists"));
    }

    #[test]
    fn test_list_profiles() {
        let tmp = TempDir::new().unwrap();
        let mgr = ProfileManager::new(tmp.path().to_path_buf());

        mgr.save("fp_a", &sample_profile()).unwrap();
        mgr.save("fp_b", &sample_profile()).unwrap();

        let profiles = mgr.list().unwrap();
        assert_eq!(profiles.len(), 2);
        assert!(profiles.contains(&"fp_a".to_string()));
        assert!(profiles.contains(&"fp_b".to_string()));
    }

    #[test]
    fn test_load_nonexistent_profile() {
        let tmp = TempDir::new().unwrap();
        let mgr = ProfileManager::new(tmp.path().to_path_buf());

        let result = mgr.load("fp_nonexistent");
        assert!(result.is_err());
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd libclaw && cargo test profile -- --nocapture
```

Expected: FAIL — methods not implemented.

- [ ] **Step 3: Write minimal implementation**

Add implementation to `libclaw/src/profile.rs` (above the `#[cfg(test)]` block):

```rust
impl ProfileManager {
    pub fn new(browser_dir: PathBuf) -> Self {
        Self { browser_dir }
    }

    pub fn profile_dir(&self, profile_id: &str) -> PathBuf {
        self.browser_dir.join(profile_id)
    }

    pub fn fingerprint_path(&self, profile_id: &str) -> PathBuf {
        self.profile_dir(profile_id).join("fingerprint.json")
    }

    pub fn exists(&self, profile_id: &str) -> bool {
        self.fingerprint_path(profile_id).exists()
    }

    pub fn save(&self, profile_id: &str, profile: &ProfileOnDisk) -> Result<(), String> {
        let dir = self.profile_dir(profile_id);
        fs::create_dir_all(&dir).map_err(|e| format!("Failed to create profile dir: {}", e))?;

        let json = serde_json::to_string_pretty(profile)
            .map_err(|e| format!("Failed to serialize profile: {}", e))?;

        fs::write(self.fingerprint_path(profile_id), json)
            .map_err(|e| format!("Failed to write profile: {}", e))?;

        Ok(())
    }

    pub fn load(&self, profile_id: &str) -> Result<ProfileOnDisk, String> {
        let path = self.fingerprint_path(profile_id);
        let json = fs::read_to_string(&path)
            .map_err(|e| format!("Failed to read profile {}: {}", profile_id, e))?;

        serde_json::from_str(&json)
            .map_err(|e| format!("Failed to parse profile {}: {}", profile_id, e))
    }

    pub fn list(&self) -> Result<Vec<String>, String> {
        let entries = fs::read_dir(&self.browser_dir)
            .map_err(|e| format!("Failed to read browser dir: {}", e))?;

        let mut profiles = Vec::new();
        for entry in entries {
            let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
            let path = entry.path();
            if path.is_dir() && path.join("fingerprint.json").exists() {
                if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
                    profiles.push(name.to_string());
                }
            }
        }
        Ok(profiles)
    }

    pub fn save_from_api_response(
        &self,
        profile_id: &str,
        request: &GenerateRequest,
        response: &GenerateResponse,
    ) -> Result<(), String> {
        let profile = ProfileOnDisk {
            schema_version: 1,
            created_at: chrono_now(),
            request: request.clone(),
            fingerprint: response.fingerprint.clone(),
            proxy: response.proxy.clone(),
        };
        self.save(profile_id, &profile)
    }
}

fn chrono_now() -> String {
    // Simple ISO 8601 timestamp without chrono dependency
    use std::time::{SystemTime, UNIX_EPOCH};
    let secs = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    // Convert epoch seconds to ISO 8601 datetime
    let days = secs / 86400;
    let time_secs = secs % 86400;
    let hours = time_secs / 3600;
    let minutes = (time_secs % 3600) / 60;
    let seconds = time_secs % 60;
    // Simple date calculation (good enough for timestamps, not a full calendar)
    let (year, month, day) = epoch_days_to_date(days);
    format!("{:04}-{:02}-{:02}T{:02}:{:02}:{:02}Z", year, month, day, hours, minutes, seconds)
}

fn epoch_days_to_date(days: u64) -> (u64, u64, u64) {
    // Simplified date calculation from epoch days
    let mut y = 1970;
    let mut remaining = days;
    loop {
        let days_in_year = if y % 4 == 0 && (y % 100 != 0 || y % 400 == 0) { 366 } else { 365 };
        if remaining < days_in_year { break; }
        remaining -= days_in_year;
        y += 1;
    }
    let leap = y % 4 == 0 && (y % 100 != 0 || y % 400 == 0);
    let month_days = [31, if leap { 29 } else { 28 }, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    let mut m = 0;
    for md in &month_days {
        if remaining < *md as u64 { break; }
        remaining -= *md as u64;
        m += 1;
    }
    (y, m + 1, remaining + 1)
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd libclaw && cargo test profile -- --nocapture
```

Expected: all 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add libclaw/src/profile.rs
git commit -m "feat(libclaw): add profile manager with save/load/list/exists"
```

---

### Task 3: Shared Memory Manager

**Files:**
- Create: `libclaw/src/shm.rs`

- [ ] **Step 1: Write the failing tests**

Create `libclaw/src/shm.rs`:

```rust
use std::ptr;
use crate::types::{ShmFingerprint, SHM_MAGIC, SHM_VERSION, Fingerprint, ProxyConfig};

pub struct ShmManager {
    shm_name: String,
    ptr: *mut ShmFingerprint,
    fd: i32,
}

// Implementation will go here

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::*;

    fn sample_fingerprint() -> Fingerprint {
        Fingerprint {
            user_agent: "Mozilla/5.0 Test".to_string(),
            platform: "MacIntel".to_string(),
            screen: Screen {
                width: 1920, height: 1080,
                avail_width: 1920, avail_height: 1055,
                color_depth: 24, pixel_ratio: 2.0,
            },
            hardware: Hardware { concurrency: 8, memory: 16 },
            webgl: WebGL { vendor: "Apple".to_string(), renderer: "Apple M2".to_string() },
            canvas_seed: 12345,
            audio_seed: 67890,
            client_rects_seed: 11111,
            timezone: "America/New_York".to_string(),
            language: vec!["en-US".to_string()],
            fonts: vec!["Arial".to_string()],
            media_devices: vec![],
            plugins: vec![],
            battery: Some(Battery { charging: true, level: 0.87 }),
            speech_voices: vec![],
        }
    }

    #[test]
    fn test_create_and_read_shm() {
        let profile_id = "test_shm_1";
        let shm_name = format!("/clawbrowser-{}-{}", profile_id, std::process::id());

        let mut mgr = ShmManager::create(&shm_name).unwrap();
        mgr.write_fingerprint(&sample_fingerprint(), &None).unwrap();

        // Read back
        let reader = ShmManager::open_readonly(&shm_name).unwrap();
        let fp = reader.read();

        assert_eq!(fp.magic, SHM_MAGIC);
        assert_eq!(fp.version, SHM_VERSION);
        assert_eq!(fp.canvas_seed, 12345);
        assert_eq!(fp.screen_width, 1920);
        assert_eq!(fp.hardware_concurrency, 8);

        // Cleanup
        drop(reader);
        mgr.unlink();
    }

    #[test]
    fn test_shm_validates_magic() {
        let shm_name = "/clawbrowser-test-magic";
        let mut mgr = ShmManager::create(shm_name).unwrap();
        mgr.write_fingerprint(&sample_fingerprint(), &None).unwrap();

        let reader = ShmManager::open_readonly(shm_name).unwrap();
        assert!(reader.validate());

        drop(reader);
        mgr.unlink();
    }

    #[test]
    fn test_shm_with_proxy() {
        let shm_name = "/clawbrowser-test-proxy";
        let proxy = Some(ProxyConfig {
            host: Some("proxy.example.com".to_string()),
            port: Some(8080),
            username: Some("user1".to_string()),
            password: Some("pass1".to_string()),
            country: Some("US".to_string()),
            city: Some("NYC".to_string()),
            connection_type: Some("residential".to_string()),
        });

        let mut mgr = ShmManager::create(shm_name).unwrap();
        mgr.write_fingerprint(&sample_fingerprint(), &proxy).unwrap();

        let reader = ShmManager::open_readonly(shm_name).unwrap();
        let fp = reader.read();

        assert_eq!(fp.has_proxy, 1);
        assert_eq!(fp.proxy_port, 8080);

        drop(reader);
        mgr.unlink();
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd libclaw && cargo test shm -- --nocapture
```

Expected: FAIL — methods not implemented.

- [ ] **Step 3: Write minimal implementation**

Add implementation to `libclaw/src/shm.rs` (above the `#[cfg(test)]` block):

```rust
impl ShmManager {
    pub fn create(shm_name: &str) -> Result<Self, String> {
        unsafe {
            // Unlink any stale shm with the same name
            let c_name = std::ffi::CString::new(shm_name)
                .map_err(|e| format!("Invalid shm name: {}", e))?;

            libc::shm_unlink(c_name.as_ptr()); // ignore error (may not exist)

            let fd = libc::shm_open(
                c_name.as_ptr(),
                libc::O_CREAT | libc::O_RDWR | libc::O_EXCL,
                0o644,
            );
            if fd < 0 {
                return Err(format!("shm_open failed: {}", std::io::Error::last_os_error()));
            }

            let size = std::mem::size_of::<ShmFingerprint>();
            if libc::ftruncate(fd, size as i64) < 0 {
                libc::close(fd);
                libc::shm_unlink(c_name.as_ptr());
                return Err(format!("ftruncate failed: {}", std::io::Error::last_os_error()));
            }

            let ptr = libc::mmap(
                ptr::null_mut(),
                size,
                libc::PROT_READ | libc::PROT_WRITE,
                libc::MAP_SHARED,
                fd,
                0,
            );
            if ptr == libc::MAP_FAILED {
                libc::close(fd);
                libc::shm_unlink(c_name.as_ptr());
                return Err(format!("mmap failed: {}", std::io::Error::last_os_error()));
            }

            Ok(Self {
                shm_name: shm_name.to_string(),
                ptr: ptr as *mut ShmFingerprint,
                fd,
            })
        }
    }

    pub fn open_readonly(shm_name: &str) -> Result<Self, String> {
        unsafe {
            let c_name = std::ffi::CString::new(shm_name)
                .map_err(|e| format!("Invalid shm name: {}", e))?;

            let fd = libc::shm_open(c_name.as_ptr(), libc::O_RDONLY, 0);
            if fd < 0 {
                return Err(format!("shm_open readonly failed: {}", std::io::Error::last_os_error()));
            }

            let size = std::mem::size_of::<ShmFingerprint>();
            let ptr = libc::mmap(
                ptr::null_mut(),
                size,
                libc::PROT_READ,
                libc::MAP_SHARED,
                fd,
                0,
            );
            if ptr == libc::MAP_FAILED {
                libc::close(fd);
                return Err(format!("mmap readonly failed: {}", std::io::Error::last_os_error()));
            }

            Ok(Self {
                shm_name: shm_name.to_string(),
                ptr: ptr as *mut ShmFingerprint,
                fd,
            })
        }
    }

    pub fn write_fingerprint(
        &mut self,
        fp: &Fingerprint,
        proxy: &Option<ProxyConfig>,
    ) -> Result<(), String> {
        unsafe {
            let shm = &mut *self.ptr;
            shm.magic = SHM_MAGIC;
            shm.version = SHM_VERSION;
            shm.canvas_seed = fp.canvas_seed;
            shm.audio_seed = fp.audio_seed;
            shm.client_rects_seed = fp.client_rects_seed;
            shm.screen_width = fp.screen.width;
            shm.screen_height = fp.screen.height;
            shm.screen_avail_width = fp.screen.avail_width;
            shm.screen_avail_height = fp.screen.avail_height;
            shm.screen_color_depth = fp.screen.color_depth;
            shm.screen_pixel_ratio = fp.screen.pixel_ratio;
            shm.hardware_concurrency = fp.hardware.concurrency;
            shm.hardware_memory = fp.hardware.memory;

            copy_str_to_buf(&fp.user_agent, &mut shm.user_agent);
            copy_str_to_buf(&fp.platform, &mut shm.platform);
            copy_str_to_buf(&fp.timezone, &mut shm.timezone);
            copy_str_to_buf(&fp.webgl.vendor, &mut shm.webgl_vendor);
            copy_str_to_buf(&fp.webgl.renderer, &mut shm.webgl_renderer);

            let lang_json = serde_json::to_string(&fp.language).unwrap_or_default();
            copy_str_to_buf(&lang_json, &mut shm.language_json);

            let fonts_json = serde_json::to_string(&fp.fonts).unwrap_or_default();
            copy_str_to_buf(&fonts_json, &mut shm.fonts_json);

            if let Some(battery) = &fp.battery {
                shm.has_battery = 1;
                shm.battery_charging = if battery.charging { 1 } else { 0 };
                shm.battery_level = battery.level;
            } else {
                shm.has_battery = 0;
            }

            if let Some(proxy) = proxy {
                shm.has_proxy = 1;
                if let Some(ref host) = proxy.host {
                    copy_str_to_buf(host, &mut shm.proxy_host);
                }
                shm.proxy_port = proxy.port.unwrap_or(0);
                if let Some(ref user) = proxy.username {
                    copy_str_to_buf(user, &mut shm.proxy_username);
                }
                if let Some(ref pass) = proxy.password {
                    copy_str_to_buf(pass, &mut shm.proxy_password);
                }
            } else {
                shm.has_proxy = 0;
            }
        }
        Ok(())
    }

    pub fn read(&self) -> ShmFingerprint {
        unsafe { ptr::read(self.ptr) }
    }

    pub fn validate(&self) -> bool {
        let fp = self.read();
        fp.magic == SHM_MAGIC && fp.version == SHM_VERSION
    }

    pub fn unlink(&mut self) {
        unsafe {
            if self.fd >= 0 {
                let size = std::mem::size_of::<ShmFingerprint>();
                libc::munmap(self.ptr as *mut libc::c_void, size);
                libc::close(self.fd);
                let c_name = std::ffi::CString::new(self.shm_name.as_str()).unwrap();
                libc::shm_unlink(c_name.as_ptr());
                self.fd = -1;
                self.ptr = std::ptr::null_mut();
            }
        }
    }

    pub fn fd(&self) -> i32 {
        self.fd
    }

    pub fn as_ptr(&self) -> *const ShmFingerprint {
        self.ptr as *const ShmFingerprint
    }
}

impl Drop for ShmManager {
    fn drop(&mut self) {
        unsafe {
            if self.fd >= 0 && !self.ptr.is_null() {
                let size = std::mem::size_of::<ShmFingerprint>();
                libc::munmap(self.ptr as *mut libc::c_void, size);
                libc::close(self.fd);
                self.fd = -1;
                self.ptr = std::ptr::null_mut();
            }
        }
    }
}

fn copy_str_to_buf(src: &str, dst: &mut [u8]) {
    let bytes = src.as_bytes();
    let len = bytes.len().min(dst.len() - 1);
    dst[..len].copy_from_slice(&bytes[..len]);
    dst[len] = 0; // null-terminate
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd libclaw && cargo test shm -- --nocapture
```

Expected: all 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add libclaw/src/shm.rs
git commit -m "feat(libclaw): add POSIX shared memory manager for fingerprint data"
```

---

### Task 4: Noise Generation

**Files:**
- Create: `libclaw/src/noise.rs`

- [ ] **Step 1: Write the failing tests**

Create `libclaw/src/noise.rs`:

```rust
/// Deterministic noise generation using seeds from the fingerprint profile.
/// Used by Chromium C++ hooks to perturb Canvas, Audio, and ClientRects.

pub struct NoiseGenerator {
    seed: i64,
}

// Implementation will go here

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_canvas_noise_deterministic() {
        let gen1 = NoiseGenerator::new(12345);
        let gen2 = NoiseGenerator::new(12345);

        let noise1: Vec<u8> = (0..100).map(|i| gen1.canvas_pixel_noise(i)).collect();
        let noise2: Vec<u8> = (0..100).map(|i| gen2.canvas_pixel_noise(i)).collect();

        assert_eq!(noise1, noise2, "Same seed should produce same noise");
    }

    #[test]
    fn test_different_seeds_different_noise() {
        let gen1 = NoiseGenerator::new(12345);
        let gen2 = NoiseGenerator::new(67890);

        let noise1: Vec<u8> = (0..100).map(|i| gen1.canvas_pixel_noise(i)).collect();
        let noise2: Vec<u8> = (0..100).map(|i| gen2.canvas_pixel_noise(i)).collect();

        assert_ne!(noise1, noise2, "Different seeds should produce different noise");
    }

    #[test]
    fn test_audio_noise_small_perturbation() {
        let gen = NoiseGenerator::new(12345);

        for i in 0..100 {
            let noise = gen.audio_sample_noise(i);
            // Audio noise should be very small (sub-perceptual)
            assert!(noise.abs() < 0.001, "Audio noise too large: {}", noise);
        }
    }

    #[test]
    fn test_client_rects_noise_sub_pixel() {
        let gen = NoiseGenerator::new(12345);

        for i in 0..100 {
            let noise = gen.client_rect_noise(i);
            // Should be sub-pixel (< 1.0)
            assert!(noise.abs() < 1.0, "Client rect noise too large: {}", noise);
        }
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd libclaw && cargo test noise -- --nocapture
```

Expected: FAIL — methods not implemented.

- [ ] **Step 3: Write minimal implementation**

Add implementation above the `#[cfg(test)]` block:

```rust
impl NoiseGenerator {
    pub fn new(seed: i64) -> Self {
        Self { seed }
    }

    /// Generate deterministic noise for a canvas pixel at the given index.
    /// Returns a small value (0-3) to XOR with pixel bytes.
    pub fn canvas_pixel_noise(&self, index: u64) -> u8 {
        let hash = self.hash(index);
        (hash & 0x03) as u8 // 0-3 range
    }

    /// Generate deterministic noise for an audio sample at the given index.
    /// Returns a very small float perturbation.
    pub fn audio_sample_noise(&self, index: u64) -> f64 {
        let hash = self.hash(index);
        // Map to range [-0.0005, 0.0005]
        ((hash % 1000) as f64 - 500.0) / 1_000_000.0
    }

    /// Generate deterministic sub-pixel noise for client rects.
    /// Returns a float in range [-0.5, 0.5].
    pub fn client_rect_noise(&self, index: u64) -> f64 {
        let hash = self.hash(index);
        ((hash % 1000) as f64 - 500.0) / 1000.0
    }

    /// Simple deterministic hash combining seed with index.
    fn hash(&self, index: u64) -> u64 {
        let mut h = self.seed as u64;
        h = h.wrapping_mul(6364136223846793005);
        h = h.wrapping_add(index);
        h = h.wrapping_mul(6364136223846793005);
        h = h.wrapping_add(1442695040888963407);
        h ^= h >> 33;
        h = h.wrapping_mul(0xff51afd7ed558ccd);
        h ^= h >> 33;
        h
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd libclaw && cargo test noise -- --nocapture
```

Expected: all 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add libclaw/src/noise.rs
git commit -m "feat(libclaw): add deterministic noise generators for canvas, audio, client rects"
```

---

### Task 5: Config and API Client

**Files:**
- Create: `libclaw/src/config.rs`
- Create: `libclaw/src/api_client.rs`

- [ ] **Step 1: Write config module**

Create `libclaw/src/config.rs`:

```rust
use std::env;
use std::fs;
use std::path::Path;
use serde::Deserialize;

#[derive(Deserialize)]
struct ConfigFile {
    api_key: Option<String>,
}

/// Load API key. Env var CLAWBROWSER_API_KEY takes precedence over config.json.
pub fn load_api_key(config_path: &Path) -> Result<String, String> {
    // Check env var first
    if let Ok(key) = env::var("CLAWBROWSER_API_KEY") {
        if !key.is_empty() {
            return Ok(key);
        }
    }

    // Fall back to config.json
    if config_path.exists() {
        let content = fs::read_to_string(config_path)
            .map_err(|e| format!("Failed to read config.json: {}", e))?;
        let config: ConfigFile = serde_json::from_str(&content)
            .map_err(|e| format!("Failed to parse config.json: {}", e))?;
        if let Some(key) = config.api_key {
            if !key.is_empty() {
                return Ok(key);
            }
        }
    }

    Err("CLAWBROWSER_API_KEY not set and no api_key in config.json".to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[test]
    fn test_load_from_config_file() {
        let tmp = TempDir::new().unwrap();
        let config_path = tmp.path().join("config.json");
        fs::write(&config_path, r#"{"api_key": "test_key_123"}"#).unwrap();

        // Clear env var to test file fallback
        env::remove_var("CLAWBROWSER_API_KEY");

        let key = load_api_key(&config_path).unwrap();
        assert_eq!(key, "test_key_123");
    }

    #[test]
    fn test_env_var_takes_precedence() {
        let tmp = TempDir::new().unwrap();
        let config_path = tmp.path().join("config.json");
        fs::write(&config_path, r#"{"api_key": "file_key"}"#).unwrap();

        env::set_var("CLAWBROWSER_API_KEY", "env_key");

        let key = load_api_key(&config_path).unwrap();
        assert_eq!(key, "env_key");

        env::remove_var("CLAWBROWSER_API_KEY");
    }

    #[test]
    fn test_missing_both_returns_error() {
        let tmp = TempDir::new().unwrap();
        let config_path = tmp.path().join("nonexistent.json");
        env::remove_var("CLAWBROWSER_API_KEY");

        let result = load_api_key(&config_path);
        assert!(result.is_err());
    }
}
```

- [ ] **Step 2: Write API client module**

Create `libclaw/src/api_client.rs`:

```rust
use crate::types::{GenerateRequest, GenerateResponse};

pub struct ApiClient {
    base_url: String,
    api_key: String,
}

impl ApiClient {
    pub fn new(base_url: &str, api_key: &str) -> Self {
        Self {
            base_url: base_url.trim_end_matches('/').to_string(),
            api_key: api_key.to_string(),
        }
    }

    pub fn generate_fingerprint(&self, req: &GenerateRequest) -> Result<GenerateResponse, String> {
        let url = format!("{}/v1/fingerprints/generate", self.base_url);

        let client = reqwest::blocking::Client::new();
        let response = client
            .post(&url)
            .header("Authorization", format!("Bearer {}", self.api_key))
            .json(req)
            .send()
            .map_err(|e| format!("API request failed: {}", e))?;

        let status = response.status();
        if !status.is_success() {
            let body = response.text().unwrap_or_default();
            return Err(format!("API returned {}: {}", status, body));
        }

        response
            .json::<GenerateResponse>()
            .map_err(|e| format!("Failed to parse API response: {}", e))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_api_client_creation() {
        let client = ApiClient::new("https://api.clawbrowser.ai", "test-key");
        assert_eq!(client.base_url, "https://api.clawbrowser.ai");
        assert_eq!(client.api_key, "test-key");
    }

    // Note: Network-dependent tests are omitted for unit tests.
    // Integration tests against a running backend should be added separately.
}
```

- [ ] **Step 3: Run all tests**

```bash
cd libclaw && cargo test -- --nocapture
```

Expected: all tests PASS.

- [ ] **Step 4: Commit**

```bash
git add libclaw/src/config.rs libclaw/src/api_client.rs
git commit -m "feat(libclaw): add config loader and API client for fingerprint service"
```

---

### Task 6: FFI Entry Points

**Files:**
- Modify: `libclaw/src/lib.rs`
- Create: `libclaw/cbindgen.toml`

- [ ] **Step 1: Write FFI entry points**

Update `libclaw/src/lib.rs`:

```rust
pub mod types;
pub mod profile;
pub mod shm;
pub mod noise;
pub mod api_client;
pub mod config;

use std::ffi::{CStr, CString};
use std::os::raw::c_char;
use std::path::PathBuf;
use std::sync::Mutex;

use types::ShmFingerprint;

static GLOBAL_SHM: Mutex<Option<shm::ShmManager>> = Mutex::new(None);
static GLOBAL_PROFILE: Mutex<Option<types::ProfileOnDisk>> = Mutex::new(None);

/// Initialize libclaw: load profile, create shared memory, write fingerprint data.
/// Returns 0 on success, -1 on error.
/// `profile_id`: C string with the fingerprint profile ID
/// `browser_dir`: C string path to ~/Library/Application Support/Clawbrowser/Browser/
/// `config_dir`: C string path to ~/Library/Application Support/Clawbrowser/
/// `shm_name_out`: buffer to receive the created shm name (null-terminated)
/// `shm_name_out_len`: size of the shm_name_out buffer
#[no_mangle]
pub extern "C" fn claw_init(
    profile_id: *const c_char,
    browser_dir: *const c_char,
    config_dir: *const c_char,
    shm_name_out: *mut c_char,
    shm_name_out_len: usize,
) -> i32 {
    let profile_id = unsafe { CStr::from_ptr(profile_id).to_string_lossy().to_string() };
    let browser_dir = unsafe { CStr::from_ptr(browser_dir).to_string_lossy().to_string() };
    let config_dir = unsafe { CStr::from_ptr(config_dir).to_string_lossy().to_string() };

    let mgr = profile::ProfileManager::new(PathBuf::from(&browser_dir));

    // Check if profile exists, if not, generate via API
    if !mgr.exists(&profile_id) {
        let config_path = PathBuf::from(&config_dir).join("config.json");
        let api_key = match config::load_api_key(&config_path) {
            Ok(key) => key,
            Err(e) => {
                eprintln!("[clawbrowser] Error: {}", e);
                return -1;
            }
        };

        // TODO: make API base URL configurable
        let client = api_client::ApiClient::new("https://api.clawbrowser.ai", &api_key);
        let request = types::GenerateRequest {
            platform: "macos".to_string(),
            browser: "chrome".to_string(),
            country: "US".to_string(), // TODO: pass from CLI args
            city: None,
            connection_type: None,
        };

        match client.generate_fingerprint(&request) {
            Ok(response) => {
                if let Err(e) = mgr.save_from_api_response(&profile_id, &request, &response) {
                    eprintln!("[clawbrowser] Error saving profile: {}", e);
                    return -1;
                }
            }
            Err(e) => {
                eprintln!("[clawbrowser] Error: cannot reach fingerprint API: {}", e);
                return -1;
            }
        }
    }

    // Load profile
    let profile = match mgr.load(&profile_id) {
        Ok(p) => p,
        Err(e) => {
            eprintln!("[clawbrowser] Error loading profile: {}", e);
            return -1;
        }
    };

    // Create shared memory
    let shm_name = format!("/clawbrowser-{}-{}", profile_id, std::process::id());
    let mut shm_mgr = match shm::ShmManager::create(&shm_name) {
        Ok(s) => s,
        Err(e) => {
            eprintln!("[clawbrowser] Error creating shared memory: {}", e);
            return -1;
        }
    };

    // Write fingerprint to shared memory
    if let Err(e) = shm_mgr.write_fingerprint(&profile.fingerprint, &profile.proxy) {
        eprintln!("[clawbrowser] Error writing to shared memory: {}", e);
        return -1;
    }

    // Output shm name for child processes
    if let Ok(c_shm_name) = CString::new(shm_name.as_str()) {
        let bytes = c_shm_name.as_bytes_with_nul();
        let copy_len = bytes.len().min(shm_name_out_len);
        unsafe {
            std::ptr::copy_nonoverlapping(bytes.as_ptr(), shm_name_out as *mut u8, copy_len);
        }
    }

    // Store globally for later access
    *GLOBAL_SHM.lock().unwrap() = Some(shm_mgr);
    *GLOBAL_PROFILE.lock().unwrap() = Some(profile);

    eprintln!("[clawbrowser] Profile {} loaded", profile_id);
    0
}

/// Get the shared memory file descriptor for inheritance by child processes.
/// Returns -1 if not initialized.
#[no_mangle]
pub extern "C" fn claw_get_shm_fd() -> i32 {
    match GLOBAL_SHM.lock().unwrap().as_ref() {
        Some(shm) => shm.fd(),
        None => -1,
    }
}

/// Read the shared memory fingerprint struct from a child process.
/// `shm_name`: the shm name passed via --clawbrowser-shm-fd flag
/// Returns a pointer to the ShmFingerprint struct, or null on error.
#[no_mangle]
pub extern "C" fn claw_read_shm(shm_name: *const c_char) -> *const ShmFingerprint {
    let shm_name = unsafe { CStr::from_ptr(shm_name).to_string_lossy().to_string() };
    match shm::ShmManager::open_readonly(&shm_name) {
        Ok(mgr) => {
            if !mgr.validate() {
                return std::ptr::null();
            }
            // Get a raw pointer to the mapped memory via a public accessor
            let ptr = mgr.as_ptr();
            // Leak the manager so the mmap stays valid for the process lifetime.
            // This is intentional — child processes hold the mapping until exit.
            std::mem::forget(mgr);
            ptr
        }
        Err(_) => std::ptr::null(),
    }
}

/// Cleanup: unlink shared memory on shutdown.
#[no_mangle]
pub extern "C" fn claw_shutdown() {
    if let Some(mut shm) = GLOBAL_SHM.lock().unwrap().take() {
        shm.unlink();
    }
    *GLOBAL_PROFILE.lock().unwrap() = None;
}

/// Create a noise generator for the given seed. Returns an opaque pointer.
#[no_mangle]
pub extern "C" fn claw_noise_new(seed: i64) -> *mut noise::NoiseGenerator {
    Box::into_raw(Box::new(noise::NoiseGenerator::new(seed)))
}

/// Get canvas pixel noise for the given index.
#[no_mangle]
pub extern "C" fn claw_noise_canvas(gen: *const noise::NoiseGenerator, index: u64) -> u8 {
    unsafe { (*gen).canvas_pixel_noise(index) }
}

/// Get audio sample noise for the given index.
#[no_mangle]
pub extern "C" fn claw_noise_audio(gen: *const noise::NoiseGenerator, index: u64) -> f64 {
    unsafe { (*gen).audio_sample_noise(index) }
}

/// Get client rect noise for the given index.
#[no_mangle]
pub extern "C" fn claw_noise_client_rect(gen: *const noise::NoiseGenerator, index: u64) -> f64 {
    unsafe { (*gen).client_rect_noise(index) }
}

/// Free a noise generator.
#[no_mangle]
pub extern "C" fn claw_noise_free(gen: *mut noise::NoiseGenerator) {
    if !gen.is_null() {
        unsafe { drop(Box::from_raw(gen)) };
    }
}
```

- [ ] **Step 2: Create cbindgen.toml**

Create `libclaw/cbindgen.toml`:

```toml
language = "C"
include_guard = "LIBCLAW_H"
autogen_warning = "/* Auto-generated by cbindgen. Do not edit. */"

[export]
include = ["ShmFingerprint", "NoiseGenerator"]
```

- [ ] **Step 3: Verify it compiles**

```bash
cd libclaw && cargo build
```

Expected: builds with no errors.

- [ ] **Step 4: Generate C header**

```bash
cd libclaw && cbindgen --config cbindgen.toml --crate libclaw --output include/libclaw.h
```

If cbindgen is not installed: `cargo install cbindgen`

Expected: `include/libclaw.h` generated with C-compatible function declarations.

- [ ] **Step 5: Run all tests**

```bash
cd libclaw && cargo test -- --nocapture
```

Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add libclaw/
git commit -m "feat(libclaw): add C FFI entry points and cbindgen header generation"
```

---

### Task 7: Integration Test

**Files:**
- Create: `libclaw/tests/integration.rs`

- [ ] **Step 1: Write integration test**

Create `libclaw/tests/integration.rs`:

```rust
use libclaw::profile::ProfileManager;
use libclaw::shm::ShmManager;
use libclaw::noise::NoiseGenerator;
use libclaw::types::*;
use tempfile::TempDir;

#[test]
fn test_full_flow_profile_to_shm_to_noise() {
    // 1. Create and save a profile
    let tmp = TempDir::new().unwrap();
    let mgr = ProfileManager::new(tmp.path().to_path_buf());

    let profile = ProfileOnDisk {
        schema_version: 1,
        created_at: "2026-03-21T14:30:00Z".to_string(),
        request: GenerateRequest {
            platform: "macos".to_string(),
            browser: "chrome".to_string(),
            country: "US".to_string(),
            city: Some("NYC".to_string()),
            connection_type: Some("residential".to_string()),
        },
        fingerprint: Fingerprint {
            user_agent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/122.0.0.0".to_string(),
            platform: "MacIntel".to_string(),
            screen: Screen {
                width: 1920, height: 1080,
                avail_width: 1920, avail_height: 1055,
                color_depth: 30, pixel_ratio: 2.0,
            },
            hardware: Hardware { concurrency: 10, memory: 16 },
            webgl: WebGL { vendor: "Apple".to_string(), renderer: "Apple M2 Pro".to_string() },
            canvas_seed: 847291,
            audio_seed: 193847,
            client_rects_seed: 582910,
            timezone: "America/New_York".to_string(),
            language: vec!["en-US".to_string(), "en".to_string()],
            fonts: vec!["Arial".to_string(), "Helvetica".to_string(), "Times New Roman".to_string()],
            media_devices: vec![],
            plugins: vec![],
            battery: Some(Battery { charging: true, level: 0.87 }),
            speech_voices: vec![],
        },
        proxy: Some(ProxyConfig {
            host: Some("proxy.example.com".to_string()),
            port: Some(8080),
            username: Some("user1".to_string()),
            password: Some("pass1".to_string()),
            country: Some("US".to_string()),
            city: Some("NYC".to_string()),
            connection_type: Some("residential".to_string()),
        }),
    };

    mgr.save("fp_integration_test", &profile).unwrap();

    // 2. Load it back
    let loaded = mgr.load("fp_integration_test").unwrap();
    assert_eq!(loaded.fingerprint.canvas_seed, 847291);

    // 3. Write to shared memory
    let shm_name = format!("/clawbrowser-integration-{}", std::process::id());
    let mut shm = ShmManager::create(&shm_name).unwrap();
    shm.write_fingerprint(&loaded.fingerprint, &loaded.proxy).unwrap();

    // 4. Read back from shared memory (simulating child process)
    let reader = ShmManager::open_readonly(&shm_name).unwrap();
    assert!(reader.validate());
    let data = reader.read();
    assert_eq!(data.canvas_seed, 847291);
    assert_eq!(data.screen_width, 1920);
    assert_eq!(data.hardware_concurrency, 10);
    assert_eq!(data.has_proxy, 1);
    assert_eq!(data.proxy_port, 8080);

    // 5. Use noise generators with seeds from shared memory
    let canvas_noise = NoiseGenerator::new(data.canvas_seed);
    let audio_noise = NoiseGenerator::new(data.audio_seed);

    // Verify noise is deterministic
    let n1 = canvas_noise.canvas_pixel_noise(0);
    let n2 = NoiseGenerator::new(847291).canvas_pixel_noise(0);
    assert_eq!(n1, n2, "Same seed should produce same canvas noise");

    // Verify audio noise is small
    let audio_val = audio_noise.audio_sample_noise(0);
    assert!(audio_val.abs() < 0.001);

    // Cleanup
    drop(reader);
    shm.unlink();
}
```

- [ ] **Step 2: Run integration test**

```bash
cd libclaw && cargo test --test integration -- --nocapture
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add libclaw/tests/
git commit -m "test(libclaw): add integration test for profile → shm → noise flow"
```

---

### Task 8: Build and Verify Library Output

- [ ] **Step 1: Build release library**

```bash
cd libclaw && cargo build --release
```

Expected: produces `target/release/liblibclaw.dylib` (macOS).

- [ ] **Step 2: Verify C header exists**

```bash
ls libclaw/include/libclaw.h
```

Expected: file exists with function declarations.

- [ ] **Step 3: Run full test suite**

```bash
cd libclaw && cargo test --all -- --nocapture
```

Expected: all tests PASS.

- [ ] **Step 4: Commit any final fixes**

```bash
git add -A && git commit -m "chore(libclaw): finalize build and verify library output"
```
