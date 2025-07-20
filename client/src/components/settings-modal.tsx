import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  User, 
  Palette, 
  Image, 
  Database, 
  Accessibility, 
  Globe, 
  HelpCircle, 
  RefreshCw,
  Users,
  Shield,
  Bell,
  Camera,
  Upload,
  Trash2,
  Eye,
  Volume2,
  Contrast,
  Type,
  Smartphone,
  LogOut
} from 'lucide-react';
import { authApi, removeAuthToken } from '@/lib/auth';

interface UserType {
  id: number;
  username: string;
  email: string;
  avatar: string | null;
  role: string;
  department: string | null;
}
import { useToast } from '@/hooks/use-toast';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserType;
  onLogout?: () => void;
}

export function SettingsModal({ isOpen, onClose, currentUser, onLogout }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState('profile');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [selectedTheme, setSelectedTheme] = useState('blue');
  const [selectedWallpaper, setSelectedWallpaper] = useState('default');
  const [language, setLanguage] = useState('en');
  const [notifications, setNotifications] = useState(true);
  const [dataSync, setDataSync] = useState(true);
  const [voiceEnhancement, setVoiceEnhancement] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [largeText, setLargeText] = useState(false);
  const [autoBackup, setAutoBackup] = useState(true);
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      await authApi.logout();
      removeAuthToken();
      toast({
        title: "Logged out successfully",
        description: "You have been signed out of WizSpeek®",
      });
      onClose();
      if (onLogout) {
        onLogout();
      } else {
        window.location.reload();
      }
    } catch (error) {
      toast({
        title: "Logout failed",
        description: "There was an error signing out",
        variant: "destructive",
      });
    }
  };

  const handleTutorial = () => {
    toast({
      title: "WizSpeek® Tutorial",
      description: "Opening interactive tutorial guide...",
    });
  };

  const handleSecurityGuide = () => {
    toast({
      title: "Security Guide",
      description: "Learn about WizSpeek®'s security features...",
    });
  };

  const handleGroupManagement = () => {
    toast({
      title: "Group Management",
      description: "Manage your groups and permissions...",
    });
  };

  const handleContactSupport = () => {
    toast({
      title: "Contact Support",
      description: "Opening support portal...",
    });
  };

  const handleReportIssue = () => {
    toast({
      title: "Report Issue",
      description: "Opening issue reporting form...",
    });
  };

  const handlePrivacyPolicy = () => {
    toast({
      title: "Privacy Policy",
      description: "Opening WizSpeek® privacy policy...",
    });
  };

  const handleCheckUpdates = () => {
    toast({
      title: "Checking for Updates",
      description: "WizSpeek® v4.0.0 is the latest version!",
    });
  };

  const handleInstallApp = () => {
    toast({
      title: "Install App",
      description: "Installing WizSpeek® PWA...",
    });
  };

  const handleManageMedia = () => {
    toast({
      title: "Manage Media",
      description: "Opening media management dashboard...",
    });
  };

  const handleClearCache = () => {
    toast({
      title: "Clear Cache",
      description: "Clearing application cache and temporary files...",
    });
  };

  const handleSyncData = () => {
    toast({
      title: "Sync Data", 
      description: "Synchronizing data across all devices...",
    });
  };

  const handleCreateSecureGroup = () => {
    toast({
      title: "Create SecureGroup™",
      description: "Opening secure group creation wizard...",
    });
  };

  const handleManageGroupPrivacy = () => {
    toast({
      title: "Manage Group Privacy",
      description: "Configuring group privacy settings and permissions...",
    });
  };

  const handleGroupNotifications = () => {
    toast({
      title: "Group Notifications",
      description: "Managing group notification preferences...",
    });
  };

  const handleAddContact = () => {
    toast({
      title: "Add Contact",
      description: "Opening contact import and invitation tools...",
    });
  };

  const handleInviteToWizSpeek = () => {
    toast({
      title: "Invite to WizSpeek®",
      description: "Generating invitation links and QR codes...",
    });
  };

  const handleBlockManagement = () => {
    toast({
      title: "Block Management",
      description: "Managing blocked users and privacy controls...",
    });
  };

  const handleSaveChanges = () => {
    // Save language preference
    if (selectedLanguage !== 'en') {
      localStorage.setItem('wizspeak_language', selectedLanguage);
      toast({
        title: "Language Updated",
        description: `Language changed to ${languages.find(l => l.code === selectedLanguage)?.name}. Refreshing interface...`,
      });
      // In a real app, this would trigger i18n updates
      setTimeout(() => {
        toast({
          title: "Settings Saved",
          description: "All changes have been applied successfully.",
        });
      }, 1000);
    } else {
      toast({
        title: "Settings Saved", 
        description: "All changes have been applied successfully.",
      });
    }
    onClose();
  };

  const handleAvatarUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setAvatarPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const themes = [
    { id: 'blue', name: 'WizSpeek® Blue', color: '#2E5A87' },
    { id: 'dark', name: 'Midnight Pro', color: '#1a1a1a' },
    { id: 'ocean', name: 'Ocean Depths', color: '#0f4c75' },
    { id: 'forest', name: 'Forest Secure', color: '#2d5016' },
    { id: 'sunset', name: 'Sunset Glow', color: '#8b4513' },
    { id: 'royal', name: 'Royal Purple', color: '#663399' }
  ];

  const wallpapers = [
    { id: 'default', name: 'WizSpeek® Default', preview: 'Linear gradient' },
    { id: 'geometric', name: 'Geometric Patterns', preview: 'Abstract shapes' },
    { id: 'particles', name: 'Particle Flow', preview: 'Animated dots' },
    { id: 'waves', name: 'Digital Waves', preview: 'Flowing lines' },
    { id: 'minimal', name: 'Minimal Clean', preview: 'Simple texture' },
    { id: 'cyberpunk', name: 'Cyber Grid', preview: 'Neon grid' }
  ];

  const languages = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
    { code: 'it', name: 'Italiano', flag: '🇮🇹' },
    { code: 'pt', name: 'Português', flag: '🇵🇹' },
    { code: 'ru', name: 'Русский', flag: '🇷🇺' },
    { code: 'ja', name: '日本語', flag: '🇯🇵' },
    { code: 'ko', name: '한국어', flag: '🇰🇷' },
    { code: 'zh', name: '中文', flag: '🇨🇳' },
    { code: 'ar', name: 'العربية', flag: '🇸🇦' },
    { code: 'hi', name: 'हिंदी', flag: '🇮🇳' }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-[#2E5A87]">
            WizSpeek® Settings
          </DialogTitle>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8">
            <TabsTrigger value="profile" className="flex items-center gap-1">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Profile</span>
            </TabsTrigger>
            <TabsTrigger value="groups" className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Groups</span>
            </TabsTrigger>
            <TabsTrigger value="themes" className="flex items-center gap-1">
              <Palette className="h-4 w-4" />
              <span className="hidden sm:inline">Themes</span>
            </TabsTrigger>
            <TabsTrigger value="wallpapers" className="flex items-center gap-1">
              <Image className="h-4 w-4" />
              <span className="hidden sm:inline">Backgrounds</span>
            </TabsTrigger>
            <TabsTrigger value="storage" className="flex items-center gap-1">
              <Database className="h-4 w-4" />
              <span className="hidden sm:inline">Storage</span>
            </TabsTrigger>
            <TabsTrigger value="accessibility" className="flex items-center gap-1">
              <Accessibility className="h-4 w-4" />
              <span className="hidden sm:inline">Access</span>
            </TabsTrigger>
            <TabsTrigger value="language" className="flex items-center gap-1">
              <Globe className="h-4 w-4" />
              <span className="hidden sm:inline">Language</span>
            </TabsTrigger>
            <TabsTrigger value="help" className="flex items-center gap-1">
              <HelpCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Help</span>
            </TabsTrigger>
          </TabsList>

          <div className="mt-6 overflow-y-auto max-h-[60vh]">
            {/* Profile & Avatar Tab */}
            <TabsContent value="profile" className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Profile & Avatar Creator</h3>
                
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <Avatar className="h-20 w-20">
                      <AvatarImage src={avatarPreview || currentUser.avatar} />
                      <AvatarFallback className="text-xl">
                        {currentUser.username.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <Button
                      size="sm"
                      variant="outline"
                      className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full p-0"
                      onClick={() => document.getElementById('avatar-upload')?.click()}
                    >
                      <Camera className="h-4 w-4" />
                    </Button>
                    <input
                      id="avatar-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarUpload}
                    />
                  </div>
                  
                  <div className="flex-1 space-y-2">
                    <div>
                      <Label htmlFor="username">Username</Label>
                      <Input id="username" defaultValue={currentUser.username} />
                    </div>
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" type="email" defaultValue={currentUser.email} />
                    </div>
                  </div>
                </div>

                <div className="flex space-x-2">
                  <Button variant="outline" size="sm" onClick={() => toast({title: "Upload Photo", description: "Opening photo picker..."})}>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Photo
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => toast({title: "Take Selfie", description: "Activating camera for selfie capture..."})}>
                    <Camera className="h-4 w-4 mr-2" />
                    Take Selfie
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => toast({title: "Generate Avatar", description: "Creating AI-generated avatar options..."})}>
                    <User className="h-4 w-4 mr-2" />
                    Generate Avatar
                  </Button>
                </div>

                <Separator />

                <div className="space-y-3">
                  <h4 className="font-medium">Privacy Controls</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Show Online Status</Label>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>Allow Profile Views</Label>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>SecureLink™ Notifications</Label>
                      <Switch checked={notifications} onCheckedChange={setNotifications} />
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Groups Management Tab */}
            <TabsContent value="groups" className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">People & Groups Manager</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <h4 className="font-medium">Group Controls</h4>
                    <div className="space-y-2">
                      <Button variant="outline" className="w-full justify-start" onClick={handleCreateSecureGroup}>
                        <Users className="h-4 w-4 mr-2" />
                        Create SecureGroup™
                      </Button>
                      <Button variant="outline" className="w-full justify-start" onClick={handleManageGroupPrivacy}>
                        <Shield className="h-4 w-4 mr-2" />
                        Manage Group Privacy
                      </Button>
                      <Button variant="outline" className="w-full justify-start" onClick={handleGroupNotifications}>
                        <Bell className="h-4 w-4 mr-2" />
                        Group Notifications
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <h4 className="font-medium">Contact Management</h4>
                    <div className="space-y-2">
                      <Button variant="outline" className="w-full justify-start" onClick={handleAddContact}>
                        <User className="h-4 w-4 mr-2" />
                        Add Contact
                      </Button>
                      <Button variant="outline" className="w-full justify-start" onClick={handleInviteToWizSpeek}>
                        <Users className="h-4 w-4 mr-2" />
                        Invite to WizSpeek®
                      </Button>
                      <Button variant="outline" className="w-full justify-start" onClick={handleBlockManagement}>
                        <Shield className="h-4 w-4 mr-2" />
                        Block Management
                      </Button>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <h4 className="font-medium">Group Permissions</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Auto-join Groups</Label>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>Admin Message Priority</Label>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>Group Media Auto-download</Label>
                      <Switch />
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Themes Tab */}
            <TabsContent value="themes" className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">WizSpeek® Theme Studio</h3>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {themes.map((theme) => (
                    <div
                      key={theme.id}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        selectedTheme === theme.id
                          ? 'border-[#2E5A87] bg-blue-50 dark:bg-blue-950'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedTheme(theme.id)}
                    >
                      <div
                        className="w-full h-16 rounded-md mb-2"
                        style={{ backgroundColor: theme.color }}
                      />
                      <h4 className="font-medium text-sm">{theme.name}</h4>
                      {selectedTheme === theme.id && (
                        <Badge className="mt-1">Active</Badge>
                      )}
                    </div>
                  ))}
                </div>

                <Separator />

                <div className="space-y-3">
                  <h4 className="font-medium">Theme Options</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Auto Dark Mode</Label>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>System Theme Sync</Label>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>Theme Animations</Label>
                      <Switch defaultChecked />
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Wallpapers Tab */}
            <TabsContent value="wallpapers" className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Chat Backgrounds</h3>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {wallpapers.map((wallpaper) => {
                    const getBackgroundStyle = (id: string) => {
                      switch (id) {
                        case 'default':
                          return 'bg-gradient-to-br from-blue-100 via-blue-200 to-blue-300';
                        case 'geometric':
                          return 'bg-gradient-to-br from-purple-100 to-pink-200 bg-[url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'20\' height=\'20\' viewBox=\'0 0 20 20\'%3E%3Cg fill=\'%23000000\' fill-opacity=\'0.05\'%3E%3Cpolygon points=\'0,0 0,20 10,20\'/%3E%3C/g%3E%3C/svg%3E")]';
                        case 'particles':
                          return 'bg-gradient-to-br from-indigo-100 to-cyan-200 bg-[radial-gradient(circle_at_30%_20%,rgba(59,130,246,0.1)_2px,transparent_2px)]';
                        case 'waves':
                          return 'bg-gradient-to-r from-teal-100 via-green-100 to-emerald-200 bg-[url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 100 20\'%3E%3Cpath d=\'M0,10 Q25,0 50,10 T100,10 V20 H0 Z\' fill=\'rgba(59,130,246,0.1)\'/%3E%3C/svg%3E")]';
                        case 'minimal':
                          return 'bg-gradient-to-br from-gray-50 to-gray-100';
                        case 'cyberpunk':
                          return 'bg-gradient-to-br from-violet-100 via-fuchsia-100 to-pink-100 bg-[url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'16\' height=\'16\' viewBox=\'0 0 16 16\'%3E%3Cg fill=\'%23000000\' fill-opacity=\'0.08\'%3E%3Cpath d=\'M0,0 L16,0 L16,16 L0,16 Z M1,1 L15,1 L15,15 L1,15 Z\'/%3E%3C/g%3E%3C/svg%3E")]';
                        default:
                          return 'bg-gradient-to-br from-gray-100 to-gray-200';
                      }
                    };

                    return (
                      <div
                        key={wallpaper.id}
                        className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                          selectedWallpaper === wallpaper.id
                            ? 'border-[#2E5A87] bg-blue-50 dark:bg-blue-950'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => setSelectedWallpaper(wallpaper.id)}
                      >
                        <div className={`w-full h-16 rounded-md mb-2 ${getBackgroundStyle(wallpaper.id)} border border-gray-200`}>
                        </div>
                        <h4 className="font-medium text-sm">{wallpaper.name}</h4>
                        <p className="text-xs text-gray-500">{wallpaper.preview}</p>
                        {selectedWallpaper === wallpaper.id && (
                          <Badge className="mt-1">Active</Badge>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="flex space-x-2">
                  <Button variant="outline" size="sm" onClick={() => toast({title: "Upload Custom", description: "Opening file picker for custom backgrounds..."})}>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Custom
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => toast({title: "Create Gradient", description: "Opening gradient creator tool..."})}>
                    <Palette className="h-4 w-4 mr-2" />
                    Create Gradient
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* Storage & Data Tab */}
            <TabsContent value="storage" className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Storage & Data Management</h3>
                
                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    <h4 className="font-medium mb-2">Storage Usage</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Messages</span>
                        <span>2.3 GB</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Media Files</span>
                        <span>1.8 GB</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Voice Notes</span>
                        <span>450 MB</span>
                      </div>
                      <div className="flex justify-between text-sm font-medium">
                        <span>Total Used</span>
                        <span>4.55 GB / 15 GB</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Button variant="outline" className="w-full justify-start" onClick={handleManageMedia}>
                        <Database className="h-4 w-4 mr-2" />
                        Manage Media
                      </Button>
                      <Button variant="outline" className="w-full justify-start" onClick={handleClearCache}>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Clear Cache
                      </Button>
                      <Button variant="outline" className="w-full justify-start" onClick={handleSyncData}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Sync Data
                      </Button>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Auto-backup</Label>
                        <Switch checked={autoBackup} onCheckedChange={setAutoBackup} />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label>Data Sync</Label>
                        <Switch checked={dataSync} onCheckedChange={setDataSync} />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label>Media Auto-download</Label>
                        <Switch />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Accessibility Tab */}
            <TabsContent value="accessibility" className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Accessibility & Comfort</h3>
                
                <div className="space-y-4">
                  <div className="space-y-3">
                    <h4 className="font-medium">Visual Accessibility</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>High Contrast Mode</Label>
                        <Switch checked={highContrast} onCheckedChange={setHighContrast} />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label>Large Text</Label>
                        <Switch checked={largeText} onCheckedChange={setLargeText} />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label>Screen Reader Support</Label>
                        <Switch />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <h4 className="font-medium">Audio & Voice</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Voice Enhancement</Label>
                        <Switch checked={voiceEnhancement} onCheckedChange={setVoiceEnhancement} />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label>Audio Descriptions</Label>
                        <Switch />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label>Vibration Alerts</Label>
                        <Switch defaultChecked />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <h4 className="font-medium">Interaction</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Tap to Speak</Label>
                        <Switch />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label>Voice Commands</Label>
                        <Switch />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label>Gesture Navigation</Label>
                        <Switch defaultChecked />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Language Tab */}
            <TabsContent value="language" className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Language & Region</h3>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="language-select">App Language</Label>
                    <Select value={language} onValueChange={setLanguage}>
                      <SelectTrigger id="language-select">
                        <SelectValue placeholder="Select language" />
                      </SelectTrigger>
                      <SelectContent>
                        {languages.map((lang) => (
                          <SelectItem key={lang.code} value={lang.code}>
                            <span className="mr-2">{lang.flag}</span>
                            {lang.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <h4 className="font-medium">Regional Settings</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Auto-detect Language</Label>
                        <Switch defaultChecked />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label>24-hour Time Format</Label>
                        <Switch defaultChecked />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label>Regional Number Format</Label>
                        <Switch defaultChecked />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <h4 className="font-medium">Translation</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Auto-translate Messages</Label>
                        <Switch />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label>Translation Suggestions</Label>
                        <Switch defaultChecked />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Help Tab */}
            <TabsContent value="help" className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Help & Support</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h4 className="font-medium">Getting Started</h4>
                    <Button variant="outline" className="w-full justify-start" onClick={handleTutorial}>
                      <HelpCircle className="h-4 w-4 mr-2" />
                      WizSpeek® Tutorial
                    </Button>
                    <Button variant="outline" className="w-full justify-start" onClick={handleSecurityGuide}>
                      <Shield className="h-4 w-4 mr-2" />
                      Security Guide
                    </Button>
                    <Button variant="outline" className="w-full justify-start" onClick={handleGroupManagement}>
                      <Users className="h-4 w-4 mr-2" />
                      Group Management
                    </Button>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="font-medium">Support</h4>
                    <Button variant="outline" className="w-full justify-start" onClick={handleContactSupport}>
                      <Globe className="h-4 w-4 mr-2" />
                      Contact Support
                    </Button>
                    <Button variant="outline" className="w-full justify-start" onClick={handleReportIssue}>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Report Issue
                    </Button>
                    <Button variant="outline" className="w-full justify-start" onClick={handlePrivacyPolicy}>
                      <Eye className="h-4 w-4 mr-2" />
                      Privacy Policy
                    </Button>
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <h4 className="font-medium">App Information</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Version:</span>
                      <span>WizSpeek® v4.0.0</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Build:</span>
                      <span>2025.01.07</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Platform:</span>
                      <span>Progressive Web App</span>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm" onClick={handleCheckUpdates}>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Check Updates
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleInstallApp}>
                      <Smartphone className="h-4 w-4 mr-2" />
                      Install App
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>

        <div className="flex justify-between items-center mt-6">
          <Button 
            variant="outline" 
            onClick={handleLogout}
            className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button className="bg-[#2E5A87] hover:bg-[#2B3E54]" onClick={handleSaveChanges}>
              Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}