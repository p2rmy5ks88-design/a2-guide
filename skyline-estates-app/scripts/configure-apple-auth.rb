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
project.save
puts 'Apple sign-in entitlement and public Firebase resource installed'
