# Adds only the public Firebase config resource and Apple authentication entitlement.
require 'xcodeproj'
require 'fileutils'
project = Xcodeproj::Project.open('ios/App/App.xcodeproj')
target = project.targets.find { |t| t.name == 'App' }
raise 'Missing App target' unless target
group = project.main_group.groups.find { |g| g.path == 'App' || g.display_name == 'App' }
raise 'Missing App source group' unless group
ref = group.files.find { |f| f.path == 'GoogleService-Info.plist' } || group.new_file('GoogleService-Info.plist')
target.resources_build_phase.add_file_reference(ref, true)
entitlements = {'com.apple.developer.applesignin' => ['Default']}
Xcodeproj::Plist.write_to_path(entitlements, 'ios/App/App/App.entitlements')
target.build_configurations.each { |c| c.build_settings['CODE_SIGN_ENTITLEMENTS'] = 'App/App.entitlements' }
attrs = project.root_object.attributes['TargetAttributes'] ||= {}
attrs[target.uuid] ||= {}
caps = attrs[target.uuid]['SystemCapabilities'] ||= {}
caps['com.apple.SignInWithApple'] = {'enabled' => 1}
# Local StoreKit 2 bridge. Keep these App-only sources out of dependency targets.
%w[SkylineStoreProducts.swift SkylineStoreKitPlugin.swift SkylineBridgeViewController.swift].each do |name|
  FileUtils.cp(File.join('native', name), File.join('ios/App/App', name))
  source_ref = group.files.find { |f| f.path == name } || group.new_file(name)
  target.source_build_phase.add_file_reference(source_ref, true)
end
target.build_configurations.each { |c| c.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '15.0' }
storyboard = 'ios/App/App/Base.lproj/Main.storyboard'
text = File.read(storyboard)
unless text.include?('customClass="SkylineBridgeViewController"')
  raise 'Missing generated Capacitor controller' unless text.include?('customClass="CAPBridgeViewController"')
  text = text.sub('customClass="CAPBridgeViewController" customModule="Capacitor"', 'customClass="SkylineBridgeViewController" customModule="App"')
  raise 'Could not register local StoreKit bridge' unless text.include?('customClass="SkylineBridgeViewController"')
  File.write(storyboard, text)
end
project.save
puts 'Apple sign-in entitlement, Firebase resource and StoreKit 2 bridge installed'
