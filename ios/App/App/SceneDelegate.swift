import UIKit
import Capacitor

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        window = UIWindow(windowScene: windowScene)
        window?.rootViewController = PickleBridgeViewController()
        window?.makeKeyAndVisible()

        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }
}

// Local bridge keeps badge mutation out of game code. Permission is requested by PushNotifications.
class PickleBridgeViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(PickleBadgePlugin())
    }
}

@objc(PickleBadgePlugin)
class PickleBadgePlugin: CAPPlugin, CAPBridgedPlugin {
    let identifier = "PickleBadgePlugin"
    let jsName = "PickleBadge"
    let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "set", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "environment", returnType: CAPPluginReturnPromise)
    ]
    @objc func set(_ call: CAPPluginCall) {
        let count = max(0, call.getInt("count") ?? 0)
        DispatchQueue.main.async {
            UIApplication.shared.applicationIconBadgeNumber = count
            call.resolve()
        }
    }
    @objc func environment(_ call: CAPPluginCall) {
        // Local Release builds can still carry a development provisioning profile.
        // App Store/TestFlight strips the embedded profile and always uses production.
        if let url = Bundle.main.url(forResource: "embedded", withExtension: "mobileprovision"),
           let profile = try? Data(contentsOf: url),
           let start = profile.range(of: Data("<?xml".utf8)),
           let end = profile.range(of: Data("</plist>".utf8), in: start.lowerBound..<profile.endIndex),
           let plist = try? PropertyListSerialization.propertyList(from: profile.subdata(in: start.lowerBound..<end.upperBound), format: nil),
           let dictionary = plist as? [String: Any],
           let entitlements = dictionary["Entitlements"] as? [String: Any],
           let environment = entitlements["aps-environment"] as? String {
            call.resolve(["value": environment == "development" ? "sandbox" : "production"])
            return
        }
        #if targetEnvironment(simulator)
        call.resolve(["value": "sandbox"])
        #else
        call.resolve(["value": "production"])
        #endif
    }
}
