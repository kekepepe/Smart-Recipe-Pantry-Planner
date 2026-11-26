import Cocoa
import Foundation

final class AppDelegate: NSObject, NSApplicationDelegate {
    private var statusItem: NSStatusItem?
    private var serverProcess: Process?
    private let controlToken = UUID().uuidString
    private let port: Int
    private let appUrl: URL
    private let logFileUrl: URL
    private var isQuitting = false

    override init() {
        let envPort = Int(ProcessInfo.processInfo.environment["PANTRY_LITE_PORT"] ?? "") ?? 32101
        self.port = (1024...65535).contains(envPort) ? envPort : 32101
        self.appUrl = URL(string: "http://127.0.0.1:\(self.port)/")!
        let logsDir = FileManager.default.homeDirectoryForCurrentUser
            .appendingPathComponent("Library/Logs/Pantry & Plate Lite", isDirectory: true)
        try? FileManager.default.createDirectory(at: logsDir, withIntermediateDirectories: true)
        self.logFileUrl = logsDir.appendingPathComponent("launcher.log")
        super.init()
    }

    func applicationDidFinishLaunching(_ notification: Notification) {
        if let bundleId = Bundle.main.bundleIdentifier {
            let others = NSRunningApplication.runningApplications(withBundleIdentifier: bundleId)
                .filter { $0 != NSRunningApplication.current }
            if !others.isEmpty {
                NSWorkspace.shared.open(appUrl)
                NSApp.terminate(nil)
                return
            }
        }

        setupStatusItem()

        guard let nodePath = findCompatibleNode() else {
            showNodeMissingAlert()
            NSApp.terminate(nil)
            return
        }

        guard let resourcePath = Bundle.main.resourcePath else {
            showErrorAlert(title: "Missing App Resources", message: "Could not locate bundled Pantry & Plate Lite files.")
            NSApp.terminate(nil)
            return
        }

        let appRoot = URL(fileURLWithPath: resourcePath).appendingPathComponent("app", isDirectory: true)
        let startScript = appRoot.appendingPathComponent("lite/start.js")
        guard FileManager.default.fileExists(atPath: startScript.path) else {
            showErrorAlert(title: "Missing App Entrypoint", message: "Could not find lite/start.js inside the app bundle.")
            NSApp.terminate(nil)
            return
        }

        startServer(nodePath: nodePath, appRoot: appRoot, startScript: startScript)
    }

    func applicationShouldHandleReopen(_ sender: NSApplication, hasVisibleWindows flag: Bool) -> Bool {
        NSWorkspace.shared.open(appUrl)
        return true
    }

    func applicationWillTerminate(_ notification: Notification) {
        isQuitting = true
        requestGracefulShutdown()
        if let proc = serverProcess, proc.isRunning {
            proc.terminate()
            let deadline = Date().addingTimeInterval(2.0)
            while proc.isRunning && Date() < deadline {
                Thread.sleep(forTimeInterval: 0.05)
            }
        }
    }

    private func setupStatusItem() {
        let item = NSStatusBar.system.statusItem(withLength: NSStatusItem.squareLength)
        if let button = item.button {
            if let iconUrl = Bundle.main.url(forResource: "icon", withExtension: "icns"),
               let image = NSImage(contentsOf: iconUrl) {
                image.size = NSSize(width: 18, height: 18)
                button.image = image
            } else {
                button.title = "P"
            }
            button.toolTip = "Pantry & Plate Lite"
        }

        let menu = NSMenu()
        let openItem = NSMenuItem(
            title: "Open Pantry & Plate / 打开今天吃什么",
            action: #selector(openInBrowser),
            keyEquivalent: "o"
        )
        openItem.target = self
        menu.addItem(openItem)

        let logItem = NSMenuItem(
            title: "View Logs / 查看日志",
            action: #selector(openLogs),
            keyEquivalent: "l"
        )
        logItem.target = self
        menu.addItem(logItem)

        menu.addItem(NSMenuItem.separator())

        let quitItem = NSMenuItem(
            title: "Quit Pantry & Plate Lite / 退出服务",
            action: #selector(quitApp),
            keyEquivalent: "q"
        )
        quitItem.target = self
        menu.addItem(quitItem)

        item.menu = menu
        self.statusItem = item
    }

    @objc private func openInBrowser() {
        NSWorkspace.shared.open(appUrl)
    }

    @objc private func openLogs() {
        if !FileManager.default.fileExists(atPath: logFileUrl.path) {
            FileManager.default.createFile(atPath: logFileUrl.path, contents: nil)
        }
        NSWorkspace.shared.open(logFileUrl)
    }

    @objc private func quitApp() {
        NSApp.terminate(nil)
    }

    private func startServer(nodePath: String, appRoot: URL, startScript: URL) {
        FileManager.default.createFile(atPath: logFileUrl.path, contents: nil)
        let logHandle = try? FileHandle(forWritingTo: logFileUrl)

        let proc = Process()
        proc.executableURL = URL(fileURLWithPath: nodePath)
        proc.arguments = [startScript.path]
        proc.currentDirectoryURL = appRoot

        var env = ProcessInfo.processInfo.environment
        env["PANTRY_LITE_CONTROL_TOKEN"] = controlToken
        env["PANTRY_LITE_PORT"] = String(port)
        let nodeDir = URL(fileURLWithPath: nodePath).deletingLastPathComponent().path
        let existingPath = env["PATH"] ?? "/usr/bin:/bin:/usr/sbin:/sbin"
        if !existingPath.split(separator: ":").contains(Substring(nodeDir)) {
            env["PATH"] = "\(nodeDir):\(existingPath)"
        }
        proc.environment = env

        if let handle = logHandle {
            proc.standardOutput = handle
            proc.standardError = handle
        }

        proc.terminationHandler = { [weak self] finished in
            guard let self = self, !self.isQuitting else { return }
            if finished.terminationStatus != 0 {
                DispatchQueue.main.async {
                    let details = (try? String(contentsOf: self.logFileUrl, encoding: .utf8))?
                        .trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
                    let tail = details.split(separator: "\n").suffix(6).joined(separator: "\n")
                    self.showErrorAlert(
                        title: "Pantry & Plate Lite Failed to Start",
                        message: tail.isEmpty ? "The local service exited unexpectedly (code \(finished.terminationStatus))." : tail
                    )
                    NSApp.terminate(nil)
                }
            }
        }

        do {
            try proc.run()
            self.serverProcess = proc
        } catch {
            showErrorAlert(title: "Failed to Launch Node.js", message: error.localizedDescription)
            NSApp.terminate(nil)
        }
    }

    private func requestGracefulShutdown() {
        guard let shutdownUrl = URL(string: "http://127.0.0.1:\(port)/api/lite-shutdown") else { return }
        var req = URLRequest(url: shutdownUrl)
        req.httpMethod = "POST"
        req.timeoutInterval = 1.5
        req.setValue(controlToken, forHTTPHeaderField: "X-Lite-Control-Token")
        let sem = DispatchSemaphore(value: 0)
        URLSession.shared.dataTask(with: req) { _, _, _ in sem.signal() }.resume()
        _ = sem.wait(timeout: .now() + 1.8)
    }

    private func findCompatibleNode() -> String? {
        let fm = FileManager.default
        let home = fm.homeDirectoryForCurrentUser.path
        var candidates: [String] = []

        if let override = ProcessInfo.processInfo.environment["PANTRY_LITE_NODE"], !override.isEmpty {
            candidates.append(override)
        }

        let envPath = ProcessInfo.processInfo.environment["PATH"] ?? ""
        for dir in envPath.split(separator: ":") {
            candidates.append("\(dir)/node")
        }

        candidates.append(contentsOf: [
            "/opt/homebrew/bin/node",
            "/opt/homebrew/opt/node@22/bin/node",
            "/usr/local/bin/node",
            "/usr/local/opt/node@22/bin/node",
            "/opt/local/bin/node",
            "\(home)/.volta/bin/node",
            "\(home)/.asdf/shims/node",
            "\(home)/.mise/shims/node",
        ])

        for root in [
            "\(home)/.nvm/versions/node",
            "\(home)/.fnm/node-versions",
            "\(home)/Library/Application Support/fnm/node-versions",
        ] {
            if let entries = try? fm.contentsOfDirectory(atPath: root) {
                for entry in entries.filter({ $0.hasPrefix("v22.") }).sorted(by: >) {
                    candidates.append("\(root)/\(entry)/bin/node")
                    candidates.append("\(root)/\(entry)/installation/bin/node")
                }
            }
        }

        var seen = Set<String>()
        for path in candidates {
            guard seen.insert(path).inserted, fm.isExecutableFile(atPath: path) else { continue }
            if isCompatibleNode(path) {
                return path
            }
        }
        return nil
    }

    private func isCompatibleNode(_ path: String) -> Bool {
        let proc = Process()
        proc.executableURL = URL(fileURLWithPath: path)
        proc.arguments = ["-p", "process.versions.node + '|' + process.arch"]
        let pipe = Pipe()
        proc.standardOutput = pipe
        proc.standardError = Pipe()
        do {
            try proc.run()
            proc.waitUntilExit()
            guard proc.terminationStatus == 0 else { return false }
            let out = String(data: pipe.fileHandleForReading.readDataToEndOfFile(), encoding: .utf8)?
                .trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
            let parts = out.split(separator: "|")
            guard parts.count == 2 else { return false }
            let ver = parts[0].split(separator: ".").compactMap { Int($0) }
            guard ver.count >= 2 else { return false }
            return ver[0] == 22 && ver[1] >= 14 && parts[1] == "arm64"
        } catch {
            return false
        }
    }

    private func showNodeMissingAlert() {
        NSApp.activate(ignoringOtherApps: true)
        let alert = NSAlert()
        alert.alertStyle = .warning
        alert.messageText = "Node.js 22.14+ (arm64) Required / 需要安装 Node.js 22.14+"
        alert.informativeText = """
        Pantry & Plate Lite requires native Apple Silicon (arm64) Node.js 22.14 or newer in the 22.x series.

        请先在本机安装原生 arm64 版本的 Node.js 22.14 或更高的 22.x（如通过 nodejs.org 或 Homebrew: brew install node@22），再重新打开应用。
        """
        alert.addButton(withTitle: "Open nodejs.org")
        alert.addButton(withTitle: "Close / 关闭")
        if alert.runModal() == .alertFirstButtonReturn {
            if let url = URL(string: "https://nodejs.org/") {
                NSWorkspace.shared.open(url)
            }
        }
    }

    private func showErrorAlert(title: String, message: String) {
        NSApp.activate(ignoringOtherApps: true)
        let alert = NSAlert()
        alert.alertStyle = .critical
        alert.messageText = title
        alert.informativeText = message
        alert.addButton(withTitle: "OK")
        alert.runModal()
    }
}

let app = NSApplication.shared
app.setActivationPolicy(.accessory)
let delegate = AppDelegate()
app.delegate = delegate
app.run()
