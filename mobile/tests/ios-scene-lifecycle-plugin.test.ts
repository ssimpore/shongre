import { describe, expect, it } from "vitest";
// Expo evaluates local config plugins as CommonJS during prebuild.
import sceneLifecyclePlugin from "../plugins/with-ios-scene-lifecycle.cjs";

const {
  applySceneManifest,
  transformAppDelegate,
}: {
  applySceneManifest: (
    value: Record<string, unknown>,
  ) => Record<string, unknown>;
  transformAppDelegate: (source: string) => string;
} = sceneLifecyclePlugin;

const appDelegateFixture = `internal import Expo
import React
import ReactAppDependencyProvider

@main
class AppDelegate: ExpoAppDelegate {
  var window: UIWindow?
  var reactNativeFactory: RCTReactNativeFactory?

  public override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    let delegate = ReactNativeDelegate()
    let factory = ExpoReactNativeFactory(delegate: delegate)
    reactNativeFactory = factory

#if os(iOS) || os(tvOS)
    window = UIWindow(frame: UIScreen.main.bounds)
    factory.startReactNative(
      withModuleName: "main",
      in: window,
      launchOptions: launchOptions)
#endif

    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }
}
`;

describe("iOS scene lifecycle config plugin", () => {
  it("moves React Native window startup into a scene delegate", () => {
    const result = transformAppDelegate(appDelegateFixture);

    expect(result).toContain("internal import ExpoModulesCore");
    expect(result).toContain("ShongreReactNativeFactoryProvider");
    expect(result).toContain(
      "class SceneDelegate: UIResponder, UIWindowSceneDelegate",
    );
    expect(result).toContain("UIWindow(windowScene: windowScene)");
    expect(result).toContain("connectionOptions.urlContexts");
    expect(result).not.toContain("UIWindow(frame: UIScreen.main.bounds)");
  });

  it("is idempotent", () => {
    const once = transformAppDelegate(appDelegateFixture);
    expect(transformAppDelegate(once)).toBe(once);
  });

  it("fails closed when the Expo template no longer matches", () => {
    expect(() => transformAppDelegate("import React\n")).toThrow(
      "Expo AppDelegate template changed",
    );
  });

  it("declares a single-window application scene", () => {
    expect(applySceneManifest({ CFBundleName: "Shongre" })).toMatchObject({
      CFBundleName: "Shongre",
      UIApplicationSceneManifest: {
        UIApplicationSupportsMultipleScenes: false,
        UISceneConfigurations: {
          UIWindowSceneSessionRoleApplication: [
            {
              UISceneConfigurationName: "Default Configuration",
              UISceneDelegateClassName: "$(PRODUCT_MODULE_NAME).SceneDelegate",
            },
          ],
        },
      },
    });
  });
});
