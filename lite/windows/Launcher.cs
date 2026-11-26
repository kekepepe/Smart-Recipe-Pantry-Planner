using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Net;
using System.Threading;
using System.Windows.Forms;

namespace PantryPlateLite {
    static class Program {
        private static Process _serverProcess;
        private static NotifyIcon _trayIcon;
        private static readonly string ControlToken = Guid.NewGuid().ToString("N");
        private static int _port = 32101;
        private static string _appUrl;
        private static string _logPath;
        private static volatile bool _isQuitting = false;

        [STAThread]
        static void Main() {
            int envPort;
            if (int.TryParse(Environment.GetEnvironmentVariable("PANTRY_LITE_PORT"), out envPort) && envPort >= 1024 && envPort <= 65535) {
                _port = envPort;
            }
            _appUrl = "http://127.0.0.1:" + _port + "/";

            string localAppData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
            string dataDir = Path.Combine(localAppData, "Pantry & Plate Lite");
            Directory.CreateDirectory(dataDir);
            _logPath = Path.Combine(dataDir, "launcher.log");

            bool createdNew;
            using (var mutex = new Mutex(true, "Local\\PantryAndPlateLiteLauncher", out createdNew)) {
                if (!createdNew) {
                    OpenBrowser(_appUrl);
                    return;
                }

                Application.EnableVisualStyles();
                Application.SetCompatibleTextRenderingDefault(false);

                string nodePath = FindCompatibleNode();
                if (nodePath == null) {
                    var res = MessageBox.Show(
                        "Pantry & Plate Lite requires x64 Node.js 22.14 or newer in the 22.x series.\n\n" +
                        "请先在本机安装 x64 版本的 Node.js 22.14 或更高的 22.x，再重新打开应用。\n\n" +
                        "Open https://nodejs.org/ now?",
                        "Pantry & Plate Lite — Node.js Required",
                        MessageBoxButtons.YesNo,
                        MessageBoxIcon.Warning
                    );
                    if (res == DialogResult.Yes) {
                        OpenBrowser("https://nodejs.org/");
                    }
                    return;
                }

                string installDir = AppDomain.CurrentDomain.BaseDirectory;
                string appRoot = Path.Combine(installDir, "app");
                string startScript = Path.Combine(appRoot, "lite", "start.js");
                if (!File.Exists(startScript)) {
                    MessageBox.Show(
                        "Could not locate lite\\start.js in " + appRoot,
                        "Pantry & Plate Lite",
                        MessageBoxButtons.OK,
                        MessageBoxIcon.Error
                    );
                    return;
                }

                SetupTrayIcon();
                if (!StartServer(nodePath, appRoot, startScript)) {
                    CleanupTray();
                    return;
                }

                Application.Run();
                ShutdownServer();
                CleanupTray();
            }
        }

        private static void SetupTrayIcon() {
            var menu = new ContextMenuStrip();
            menu.Items.Add("Open Pantry & Plate / 打开今天吃什么", null, (s, e) => OpenBrowser(_appUrl));
            menu.Items.Add("View Logs / 查看日志", null, (s, e) => OpenLogs());
            menu.Items.Add(new ToolStripSeparator());
            menu.Items.Add("Quit Pantry & Plate Lite / 退出服务", null, (s, e) => {
                _isQuitting = true;
                Application.Exit();
            });

            _trayIcon = new NotifyIcon {
                Icon = Icon.ExtractAssociatedIcon(Application.ExecutablePath) ?? SystemIcons.Application,
                Text = "Pantry & Plate Lite",
                ContextMenuStrip = menu,
                Visible = true,
            };
            _trayIcon.DoubleClick += (s, e) => OpenBrowser(_appUrl);
        }

        private static void CleanupTray() {
            if (_trayIcon != null) {
                _trayIcon.Visible = false;
                _trayIcon.Dispose();
                _trayIcon = null;
            }
        }

        private static bool StartServer(string nodePath, string appRoot, string startScript) {
            try {
                File.WriteAllText(_logPath, string.Empty);
                var psi = new ProcessStartInfo {
                    FileName = nodePath,
                    Arguments = "\"" + startScript + "\"",
                    WorkingDirectory = appRoot,
                    UseShellExecute = false,
                    CreateNoWindow = true,
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                };
                psi.EnvironmentVariables["PANTRY_LITE_CONTROL_TOKEN"] = ControlToken;
                psi.EnvironmentVariables["PANTRY_LITE_PORT"] = _port.ToString();

                var proc = new Process { StartInfo = psi, EnableRaisingEvents = true };
                var logLock = new object();
                DataReceivedEventHandler writeLog = (sender, args) => {
                    if (args.Data == null) return;
                    lock (logLock) {
                        try { File.AppendAllText(_logPath, args.Data + Environment.NewLine); } catch { }
                    }
                };
                proc.OutputDataReceived += writeLog;
                proc.ErrorDataReceived += writeLog;
                proc.Exited += (sender, args) => {
                    if (_isQuitting) return;
                    int code = 0;
                    try { code = proc.ExitCode; } catch { }
                    if (code != 0) {
                        string msg = "The local service exited unexpectedly (code " + code + ").";
                        try {
                            string content = File.ReadAllText(_logPath).Trim();
                            if (!string.IsNullOrEmpty(content)) msg = content;
                        } catch { }
                        MessageBox.Show(msg, "Pantry & Plate Lite Failed to Start", MessageBoxButtons.OK, MessageBoxIcon.Error);
                        Application.Exit();
                    }
                };

                proc.Start();
                proc.BeginOutputReadLine();
                proc.BeginErrorReadLine();
                _serverProcess = proc;
                return true;
            } catch (Exception ex) {
                MessageBox.Show("Failed to start Node.js: " + ex.Message, "Pantry & Plate Lite", MessageBoxButtons.OK, MessageBoxIcon.Error);
                return false;
            }
        }

        private static void ShutdownServer() {
            _isQuitting = true;
            try {
                var req = (HttpWebRequest)WebRequest.Create("http://127.0.0.1:" + _port + "/api/lite-shutdown");
                req.Method = "POST";
                req.Timeout = 1500;
                req.Headers["X-Lite-Control-Token"] = ControlToken;
                req.ContentLength = 0;
                using (var resp = req.GetResponse()) { }
            } catch { }

            if (_serverProcess != null) {
                try {
                    if (!_serverProcess.HasExited) {
                        if (!_serverProcess.WaitForExit(1500)) {
                            _serverProcess.Kill();
                        }
                    }
                } catch { }
            }
        }

        private static string FindCompatibleNode() {
            var candidates = new List<string>();
            string overrideNode = Environment.GetEnvironmentVariable("PANTRY_LITE_NODE");
            if (!string.IsNullOrEmpty(overrideNode)) candidates.Add(overrideNode);

            string pathEnv = Environment.GetEnvironmentVariable("PATH") ?? string.Empty;
            foreach (string dir in pathEnv.Split(';')) {
                if (!string.IsNullOrWhiteSpace(dir)) {
                    candidates.Add(Path.Combine(dir.Trim(), "node.exe"));
                }
            }

            string programFiles = Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles);
            string localAppData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
            string userProfile = Environment.GetFolderPath(Environment.SpecialFolder.UserProfile);
            string nvmSymlink = Environment.GetEnvironmentVariable("NVM_SYMLINK");

            candidates.Add(Path.Combine(programFiles, "nodejs", "node.exe"));
            candidates.Add(Path.Combine(localAppData, "Programs", "nodejs", "node.exe"));
            if (!string.IsNullOrEmpty(nvmSymlink)) candidates.Add(Path.Combine(nvmSymlink, "node.exe"));
            candidates.Add(Path.Combine(userProfile, ".volta", "bin", "node.exe"));

            var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            foreach (string candidate in candidates) {
                if (string.IsNullOrEmpty(candidate) || !seen.Add(candidate) || !File.Exists(candidate)) continue;
                if (IsCompatibleNode(candidate)) return candidate;
            }
            return null;
        }

        private static bool IsCompatibleNode(string path) {
            try {
                var psi = new ProcessStartInfo {
                    FileName = path,
                    Arguments = "-p \"process.versions.node + '|' + process.arch\"",
                    UseShellExecute = false,
                    CreateNoWindow = true,
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                };
                using (var proc = Process.Start(psi)) {
                    string output = proc.StandardOutput.ReadToEnd().Trim();
                    proc.WaitForExit(3000);
                    if (proc.ExitCode != 0) return false;
                    string[] parts = output.Split('|');
                    if (parts.Length != 2) return false;
                    string[] ver = parts[0].Split('.');
                    int major, minor;
                    if (ver.Length < 2 || !int.TryParse(ver[0], out major) || !int.TryParse(ver[1], out minor)) return false;
                    return major == 22 && minor >= 14 && parts[1] == "x64";
                }
            } catch {
                return false;
            }
        }

        private static void OpenBrowser(string url) {
            try {
                Process.Start(new ProcessStartInfo { FileName = url, UseShellExecute = true });
            } catch { }
        }

        private static void OpenLogs() {
            try {
                if (!File.Exists(_logPath)) File.WriteAllText(_logPath, string.Empty);
                Process.Start(new ProcessStartInfo { FileName = _logPath, UseShellExecute = true });
            } catch { }
        }
    }
}
