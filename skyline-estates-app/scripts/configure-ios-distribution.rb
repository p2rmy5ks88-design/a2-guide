# Apply manual signing only to the App target; Pods must not receive an app profile.
require 'json'
require 'xcodeproj'
config = JSON.parse(File.read(ARGV.fetch(1)))
raise 'Unexpected signing team/app' unless config['team'] == 'HS85466T3Z' && config['bundle'] == 'com.kenstylez.skylineestates'
raise 'Invalid signing identity' unless config['certificate'].match?(/\A[0-9A-F]{40}\z/)
raise 'Invalid profile identifier' unless config['profile'].match?(/\A[0-9A-F]{8}-(?:[0-9A-F]{4}-){3}[0-9A-F]{12}\z/)
project = Xcodeproj::Project.open(ARGV.fetch(0))
target = project.targets.find { |t| t.name == 'App' }
raise 'Missing App target' unless target
target.build_configurations.each do |c|
  raise 'Unexpected bundle identifier' unless c.build_settings['PRODUCT_BUNDLE_IDENTIFIER'] == config['bundle']
  c.build_settings['CODE_SIGN_STYLE'] = 'Manual'
  c.build_settings['DEVELOPMENT_TEAM'] = config['team']
  c.build_settings['CODE_SIGN_IDENTITY'] = config['certificate']
  c.build_settings['CODE_SIGN_IDENTITY[sdk=iphoneos*]'] = config['certificate']
  c.build_settings['PROVISIONING_PROFILE_SPECIFIER'] = config['profile']
  c.build_settings.delete('PROVISIONING_PROFILE')
end
project.save
puts 'Manual distribution signing configured for App target only'
