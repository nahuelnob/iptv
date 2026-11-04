package com.nahuelnob.iptv;

import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.MalformedURLException;
import java.net.URL;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Installs a newer APK of this app: downloads it from a GitHub release into the cache and hands it
 * to Android's package installer, which asks the user to confirm. Android itself refuses an update
 * signed with a different key, so only builds signed with the release key can replace the app.
 *
 * install({ url }) resolves once the installer is open. It rejects with code
 * INSTALL_PERMISSION_REQUIRED (after opening that setting) when the user has not yet allowed this
 * app to install apps, INVALID_URL / INVALID_APK when the URL or the file is not a release of this
 * app, and DOWNLOAD_FAILED otherwise. "progress" events carry { percent }.
 */
@CapacitorPlugin(name = "AppUpdate")
public class AppUpdatePlugin extends Plugin {

    private static final int TIMEOUT_MS = 30_000;
    private static final String APK_MIME = "application/vnd.android.package-archive";

    private final ExecutorService executor = Executors.newSingleThreadExecutor();

    @Override
    public void load() {
        // A previous update that was installed (or abandoned) leaves its APK behind.
        File stale = apkFile();
        if (stale.exists()) stale.delete();
    }

    @PluginMethod
    public void install(PluginCall call) {
        String url = call.getString("url");
        if (!isReleaseUrl(url)) {
            call.reject("Updates only come from GitHub releases over https.", "INVALID_URL");
            return;
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
            && !getContext().getPackageManager().canRequestPackageInstalls()) {
            openInstallPermissionSetting();
            call.reject("Allow this app to install apps, then try again.", "INSTALL_PERMISSION_REQUIRED");
            return;
        }

        executor.execute(() -> {
            try {
                File apk = download(url);
                if (!isThisApp(apk)) {
                    apk.delete();
                    call.reject("The downloaded file is not an update of this app.", "INVALID_APK");
                    return;
                }
                if (getActivity() == null) {
                    call.reject("The app was closed during the download.", "DOWNLOAD_FAILED");
                    return;
                }
                getActivity().runOnUiThread(() -> {
                    try {
                        openInstaller(apk);
                        call.resolve();
                    } catch (RuntimeException error) {
                        call.reject("Could not open the package installer.", "DOWNLOAD_FAILED", error);
                    }
                });
            } catch (Exception error) {
                // Anything left uncaught on this thread would crash the app.
                call.reject("Could not download the update.", "DOWNLOAD_FAILED", error);
            }
        });
    }

    @Override
    protected void handleOnDestroy() {
        executor.shutdownNow();
    }

    // Only this repository's release downloads: neither the page nor a crafted API answer can point
    // the installer anywhere else. Parsed with java.net.URL, the same parser the connection uses.
    // GitHub then redirects (https) to its download storage.
    private static final String RELEASE_PATH = "/nahuelnob/iptv/releases/download/";

    private static boolean isReleaseUrl(String url) {
        if (url == null) return false;
        try {
            URL parsed = new URL(url);
            return "https".equals(parsed.getProtocol())
                && "github.com".equalsIgnoreCase(parsed.getHost())
                && parsed.getPort() == -1
                && parsed.getUserInfo() == null
                && parsed.getPath().startsWith(RELEASE_PATH)
                && !parsed.getPath().contains("..");
        } catch (MalformedURLException error) {
            return false;
        }
    }

    // Android refuses an update signed with another key, but it would happily install a different
    // app; so the file must at least be a package of this app.
    private boolean isThisApp(File apk) {
        PackageInfo info = getContext().getPackageManager().getPackageArchiveInfo(apk.getPath(), 0);
        return info != null && getContext().getPackageName().equals(info.packageName);
    }

    private File apkFile() {
        return new File(new File(getContext().getCacheDir(), "updates"), "nodo-update.apk");
    }

    private File download(String url) throws IOException {
        File apk = apkFile();
        File folder = apk.getParentFile();
        if (folder != null && !folder.exists() && !folder.mkdirs()) {
            throw new IOException("Cannot create " + folder);
        }

        HttpURLConnection connection = (HttpURLConnection) new URL(url).openConnection();
        connection.setConnectTimeout(TIMEOUT_MS);
        connection.setReadTimeout(TIMEOUT_MS);
        connection.setInstanceFollowRedirects(true);
        try {
            int status = connection.getResponseCode();
            if (status != HttpURLConnection.HTTP_OK) throw new IOException("HTTP " + status);
            if (!"https".equals(connection.getURL().getProtocol())) throw new IOException("Redirected off https");

            long total = connection.getContentLengthLong();
            long received = 0;
            int lastPercent = -1;
            byte[] buffer = new byte[64 * 1024];
            try (InputStream in = connection.getInputStream(); OutputStream out = new FileOutputStream(apk)) {
                for (int read; (read = in.read(buffer)) != -1; ) {
                    out.write(buffer, 0, read);
                    received += read;
                    if (total > 0) {
                        int percent = (int) (received * 100 / total);
                        if (percent != lastPercent) {
                            lastPercent = percent;
                            JSObject data = new JSObject();
                            data.put("percent", percent);
                            notifyListeners("progress", data);
                        }
                    }
                }
            }
            if (total > 0 && received != total) throw new IOException("Download cut short");
            return apk;
        } finally {
            connection.disconnect();
        }
    }

    private void openInstaller(File apk) {
        Uri uri = FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", apk);
        Intent intent = new Intent(Intent.ACTION_VIEW)
            .setDataAndType(uri, APK_MIME)
            .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
        getActivity().startActivity(intent);
    }

    // Android TV builds differ: try this app's own toggle, then the general security settings.
    private void openInstallPermissionSetting() {
        Uri packageUri = Uri.parse("package:" + getContext().getPackageName());
        Intent[] candidates = {
            new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, packageUri),
            new Intent(Settings.ACTION_SECURITY_SETTINGS),
        };
        for (Intent intent : candidates) {
            try {
                getActivity().startActivity(intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
                return;
            } catch (ActivityNotFoundException ignored) {
                // try the next one
            }
        }
    }
}
