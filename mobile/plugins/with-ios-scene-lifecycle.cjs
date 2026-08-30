const { withAppDelegate, withInfoPlist } = require("expo/config-plugins");

const MARKER = "// @shongre/ios-scene-lifecycle";

// Compatibility backport of Expo's upstream scene delegate for stable SDK 57.
// Keep the behavior aligned with packages/expo/ios/AppDelegates on Expo main.
const SCENE_DELEGATE_BACKPORT = `

${MARKER}
private protocol ShongreReactNativeFactoryProvider: AnyObject {
  var window: UIWindow? { get set }
  var reactNativeFactory: RCTReactNativeFactory? { get }
}

@objc(SceneDelegate)
class SceneDelegate: UIResponder, UIWindowSceneDelegate {
  var window: UIWindow?

  func scene(
    _ scene: UIScene,
    willConnectTo session: UISceneSession,
    options connectionOptions: UIScene.ConnectionOptions
  ) {
    guard let windowScene = scene as? UIWindowScene else {
      return
    }
    guard
      let provider = UIApplication.shared.delegate as? ShongreReactNativeFactoryProvider,
      let factory = provider.reactNativeFactory
    else {
      fatalError(
        "SceneDelegate couldn't start React Native because AppDelegate did not provide its factory."
      )
    }

    let window = UIWindow(windowScene: windowScene)
    self.window = window
    provider.window = window

    let browsingWebActivity = connectionOptions.userActivities.first {
      $0.activityType == NSUserActivityTypeBrowsingWeb
    }
    factory.startReactNative(
      withModuleName: "main",
      in: window,
      launchOptions: Self.launchOptions(
        url: connectionOptions.urlContexts.first?.url,
        userActivity: browsingWebActivity
      )
    )

    Self.route(urlContexts: connectionOptions.urlContexts)
    connectionOptions.userActivities.forEach { Self.route(userActivity: $0) }
  }

  func sceneDidDisconnect(_ scene: UIScene) {
    window = nil
  }

  func sceneDidBecomeActive(_ scene: UIScene) {
    ExpoAppDelegateSubscriberManager.applicationDidBecomeActive(UIApplication.shared)
  }

  func sceneWillResignActive(_ scene: UIScene) {
    ExpoAppDelegateSubscriberManager.applicationWillResignActive(UIApplication.shared)
  }

  func sceneWillEnterForeground(_ scene: UIScene) {
    ExpoAppDelegateSubscriberManager.applicationWillEnterForeground(UIApplication.shared)
  }

  func sceneDidEnterBackground(_ scene: UIScene) {
    ExpoAppDelegateSubscriberManager.applicationDidEnterBackground(UIApplication.shared)
  }

  func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
    Self.route(urlContexts: URLContexts)
  }

  func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
    Self.route(userActivity: userActivity)
  }

  private static func launchOptions(
    url: URL?,
    userActivity: NSUserActivity?
  ) -> [UIApplication.LaunchOptionsKey: Any]? {
    var launchOptions: [UIApplication.LaunchOptionsKey: Any] = [:]
    if let url = url {
      let urlKey = UIApplication.LaunchOptionsKey(
        rawValue: "UIApplicationLaunchOptionsURLKey"
      )
      launchOptions[urlKey] = url
    }
    if let userActivity = userActivity {
      let userActivityDictionaryKey = UIApplication.LaunchOptionsKey(
        rawValue: "UIApplicationLaunchOptionsUserActivityDictionaryKey"
      )
      launchOptions[userActivityDictionaryKey] = [
        "UIApplicationLaunchOptionsUserActivityTypeKey": userActivity.activityType,
        "UIApplicationLaunchOptionsUserActivityKey": userActivity,
      ]
    }
    return launchOptions.isEmpty ? nil : launchOptions
  }

  private static func route(urlContexts: Set<UIOpenURLContext>) {
    for context in urlContexts {
      let options = openURLOptions(from: context.options)
      _ = ExpoAppDelegateSubscriberManager.application(
        UIApplication.shared,
        open: context.url,
        options: options
      )
      RCTLinkingManager.application(
        UIApplication.shared,
        open: context.url,
        options: options
      )
    }
  }

  private static func route(userActivity: NSUserActivity) {
    _ = ExpoAppDelegateSubscriberManager.application(
      UIApplication.shared,
      continue: userActivity,
      restorationHandler: { _ in }
    )
    RCTLinkingManager.application(
      UIApplication.shared,
      continue: userActivity,
      restorationHandler: { _ in }
    )
  }

  private static func openURLOptions(
    from sceneOptions: UIScene.OpenURLOptions
  ) -> [UIApplication.OpenURLOptionsKey: Any] {
    var options: [UIApplication.OpenURLOptionsKey: Any] = [:]
    if let sourceApplication = sceneOptions.sourceApplication {
      options[.sourceApplication] = sourceApplication
    }
    if let annotation = sceneOptions.annotation {
      options[.annotation] = annotation
    }
    options[.openInPlace] = sceneOptions.openInPlace
    return options
  }
}
`;

function replaceOnce(source, search, replacement, description) {
  const first = source.indexOf(search);
  if (first === -1 || source.indexOf(search, first + search.length) !== -1) {
    throw new Error(
      `[with-ios-scene-lifecycle] Expected exactly one ${description}. ` +
        "The Expo AppDelegate template changed; review the upstream scene lifecycle before regenerating native projects.",
    );
  }
  return source.replace(search, replacement);
}

function transformAppDelegate(source) {
  // A future stable Expo template can own the scene lifecycle without this backport.
  if (
    source.includes(
      "class AppDelegate: ExpoAppDelegate, ExpoReactNativeFactoryProvider",
    )
  ) {
    return source;
  }
  if (source.includes(MARKER)) {
    return source;
  }

  let transformed = replaceOnce(
    source,
    "import React\n",
    "import React\ninternal import ExpoModulesCore\n",
    "React import",
  );
  transformed = replaceOnce(
    transformed,
    "class AppDelegate: ExpoAppDelegate {",
    "class AppDelegate: ExpoAppDelegate, ShongreReactNativeFactoryProvider {",
    "AppDelegate declaration",
  );

  const legacyStart = `#if os(iOS) || os(tvOS)
    window = UIWindow(frame: UIScreen.main.bounds)
    factory.startReactNative(
      withModuleName: "main",
      in: window,
      launchOptions: launchOptions)
#endif
`;
  transformed = replaceOnce(
    transformed,
    legacyStart,
    `    ${MARKER}\n    // SceneDelegate creates the UIWindow and starts React Native.\n`,
    "legacy React Native window bootstrap",
  );

  return `${transformed.trimEnd()}${SCENE_DELEGATE_BACKPORT}\n`;
}

function applySceneManifest(infoPlist) {
  return {
    ...infoPlist,
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
  };
}

function withIosSceneLifecycle(config) {
  config = withInfoPlist(config, (mod) => {
    mod.modResults = applySceneManifest(mod.modResults);
    return mod;
  });
  return withAppDelegate(config, (mod) => {
    if (mod.modResults.language !== "swift") {
      throw new Error(
        "[with-ios-scene-lifecycle] Shongre requires a Swift AppDelegate.",
      );
    }
    mod.modResults.contents = transformAppDelegate(mod.modResults.contents);
    return mod;
  });
}

module.exports = withIosSceneLifecycle;
module.exports.applySceneManifest = applySceneManifest;
module.exports.transformAppDelegate = transformAppDelegate;
