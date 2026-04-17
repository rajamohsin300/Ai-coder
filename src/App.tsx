import React, { useState, useEffect, useRef } from 'react';
import { Settings, Plus, Play, CheckCircle2, Terminal, Code2, Cpu, MessageSquareCode, GripHorizontal, LayoutGrid, Smartphone, X, Move, LayoutTemplate, Copy, Check } from 'lucide-react';

const IDE_OPTIONS = [
  'Global (Any Input)',
  'Dcoder',
  'HopWeb',
  'Termux',
  'WhatsApp',
  'AIDE',
  'Web IDE (Chrome/Firefox)'
];

// Type declaration for Android Javascript bridge
declare global {
  interface Window {
    Android?: {
      startOverlay: () => void;
      injectCode: (code: string) => void;
      showToast: (message: string) => void;
      requestOverlayPermission: () => void;
      requestAccessibilityPermission: () => void;
    };
  }
}

export default function App() {
  const [activeTab, setActiveTab] = useState('Home');
  const [isWidgetOpen, setIsWidgetOpen] = useState(false);
  const [notification, setNotification] = useState('');

  // Agents State
  const [profiles, setProfiles] = useState([
    { name: 'React Node', prompt: 'You are a React/Node expert.', targetIDE: 'HopWeb' },
    { name: 'Python Scripting', prompt: 'Write concise python.', targetIDE: 'Termux' },
    { name: 'General Assistant', prompt: 'Helpful code assistant.', targetIDE: 'Global (Any Input)' },
  ]);
  const [newProfileName, setNewProfileName] = useState('');
  const [newProfilePrompt, setNewProfilePrompt] = useState('');
  const [newProfileIDE, setNewProfileIDE] = useState(IDE_OPTIONS[0]);

  // Settings State
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [model, setModel] = useState('');

  // Widget State
  type Message = { id: string; role: 'user' | 'agent'; text: string; profile?: string; isLoading?: boolean; };
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [widgetInput, setWidgetInput] = useState('');
  const [isSimulatingTyping, setIsSimulatingTyping] = useState(false);
  const [selectedHomeProfile, setSelectedHomeProfile] = useState(profiles[0]?.name || '');

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Drag State
  const [widgetPos, setWidgetPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, startPos: { x: 0, y: 0 } });

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    dragStart.current = { x: e.clientX, y: e.clientY, startPos: { ...widgetPos } };
    setIsDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setWidgetPos({
      x: dragStart.current.startPos.x + (e.clientX - dragStart.current.x),
      y: dragStart.current.startPos.y + (e.clientY - dragStart.current.y)
    });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const showNotification = (msg: string) => {
    setNotification(msg);
    if (window.Android) window.Android.showToast(msg);
    setTimeout(() => setNotification(''), 3000);
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    if (window.Android) window.Android.showToast('Copied to clipboard');
  };

  const handleSaveProfile = () => {
    if (newProfileName.trim()) {
      setProfiles([...profiles, { 
        name: newProfileName, 
        prompt: newProfilePrompt,
        targetIDE: newProfileIDE
      }]);
      setNewProfileName('');
      setNewProfilePrompt('');
      setNewProfileIDE(IDE_OPTIONS[0]);
      showNotification('Profile saved successfully.');
    }
  };

  const handleDeleteProfile = (index: number) => {
    const newProfiles = profiles.filter((_, i) => i !== index);
    setProfiles(newProfiles);
    if (selectedHomeProfile === profiles[index].name && newProfiles.length > 0) {
      setSelectedHomeProfile(newProfiles[0].name);
    }
    showNotification('Profile deleted.');
  };

  const handleSaveSettings = () => {
    showNotification('API Settings saved securely.');
  };

  const handleRequestPermission = () => {
    if (window.Android && window.Android.requestOverlayPermission) {
      window.Android.requestOverlayPermission();
    } else {
      showNotification('Simulating native request: SYSTEM_ALERT_WINDOW permission.');
    }
  };

  const handleRequestAccessibility = () => {
    if (window.Android && window.Android.requestAccessibilityPermission) {
      window.Android.requestAccessibilityPermission();
    } else {
      showNotification('Simulating native request: Accessibility Service permission.');
    }
  };

  const handleInitializeOverlay = () => {
    setIsWidgetOpen(true);
    if (window.Android) {
      window.Android.startOverlay();
    }
  };

  const simulateTyping = () => {
    if (!widgetInput.trim()) return showNotification('Please enter a prompt first.');
    
    setIsSimulatingTyping(true);
    
    // Simulate thinking/generation delay
    setTimeout(() => {
      setIsSimulatingTyping(false);
      const fakeCode = `// Generated for ${selectedHomeProfile}\nconsole.log("Hello World");`;
      
      if (window.Android) {
        // Native Android execution
        window.Android.injectCode(fakeCode);
      } else {
        // Web Simulation fallback
        alert(`Native Bridge Missing.\nIn a real Android app, AccessibilityServices would type this into ${profiles.find(p => p.name === selectedHomeProfile)?.targetIDE}:\n\n${fakeCode}`);
      }
    }, 1500);
  };

  const simulateReply = () => {
    if (!widgetInput.trim()) return showNotification('Please enter a prompt first.');
    
    const userText = widgetInput.trim();
    const msgId = Date.now().toString();
    
    setMessages(prev => [
      ...prev, 
      { id: msgId + '-user', role: 'user', text: userText },
      { id: msgId + '-agent', role: 'agent', text: '', profile: selectedHomeProfile, isLoading: true }
    ]);
    setWidgetInput('');

    setTimeout(() => {
      setMessages(prev => prev.map(msg => 
        msg.id === msgId + '-agent'
          ? { ...msg, text: `Here is the snippet for ${selectedHomeProfile}:\n\n\`\`\`javascript\nconsole.log("Engine loaded.");\n// Ready to inject payload.\n\`\`\``, isLoading: false }
          : msg
      ));
    }, 1500);
  };

  return (
    <div className="h-screen w-full bg-[#09090b] font-sans flex flex-col md:flex-row overflow-hidden text-zinc-100 selection:bg-indigo-500/30">
      
      {/* Global Notification Toast */}
      {notification && (
        <div className="fixed top-8 inset-x-4 z-50 flex justify-center animate-in slide-in-from-top-4 fade-in duration-300 pointer-events-none">
          <div className="bg-indigo-500 text-white text-xs px-4 py-2 rounded-md shadow-lg font-medium pointer-events-auto border border-indigo-400/20">
            {notification}
          </div>
        </div>
      )}

      {/* Responsive Sidebar / Top Nav */}
      <div className="w-full md:w-64 bg-[#0c0c0e] border-b md:border-b-0 md:border-r border-zinc-800/50 flex flex-col shrink-0 z-20">
        <div className="h-14 md:h-16 px-4 md:px-6 flex items-center justify-between border-b border-zinc-800/50 shrink-0">
          <div className="flex items-center gap-2 md:gap-3">
            <Cpu className="w-5 h-5 text-indigo-500" />
            <h1 className="text-base md:text-lg font-semibold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-cyan-400 tracking-tight">
              Synapse IDE
            </h1>
          </div>
          {/* Mobile Bridge Status */}
           <div className="flex md:hidden flex-col items-end justify-center h-full">
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-green-500/10 border border-green-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
                <span className="text-[10px] font-medium text-green-400 uppercase tracking-wider">Active</span>
              </div>
           </div>
        </div>
        <nav className="flex-row md:flex-col flex px-2 py-2 md:py-6 md:px-3 overflow-x-auto custom-scrollbar md:h-full gap-1 md:gap-1 shrink-0">
          {[
            { id: 'Home', icon: LayoutTemplate, label: 'Dashboard' },
            { id: 'Agents', icon: LayoutGrid, label: 'Agent Profiles' },
            { id: 'Settings', icon: Settings, label: 'Preferences' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-auto md:w-full flex items-center gap-2 md:gap-3 px-3 py-2 md:py-2.5 rounded-lg transition-all duration-200 whitespace-nowrap shrink-0 ${
                activeTab === tab.id
                  ? 'bg-indigo-500/10 text-indigo-400 font-medium border border-indigo-500/10'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 border border-transparent'
              }`}
            >
              <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-indigo-400' : 'text-zinc-500'}`} />
              <span className="text-sm">{tab.label}</span>
            </button>
          ))}
        </nav>
        <div className="hidden md:block p-4 border-t border-zinc-800/50 mt-auto">
           <div className="flex items-center gap-2 text-xs text-zinc-500">
              <span className="w-2 h-2 rounded-full bg-green-500/80"></span>
              Bridge Active
           </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar relative z-0 p-4 md:p-10 bg-[#09090b]">
        <div className="max-w-4xl mx-auto w-full">
          
          {/* HOME TAB */}
          {activeTab === 'Home' && (
            <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="space-y-1.5 md:space-y-2 mt-2 md:mt-4">
                <h2 className="text-2xl md:text-3xl font-semibold text-white tracking-tight">Ready to load context.</h2>
                <p className="text-zinc-500 text-xs md:text-sm">Select a profile to initialize engine.</p>
              </div>

              <div className="space-y-4">
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500">Active Profile</label>
                <div className="relative">
                  <select 
                    value={selectedHomeProfile}
                    onChange={(e) => setSelectedHomeProfile(e.target.value)}
                    className="w-full py-3.5 pr-11 pl-11 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all appearance-none shadow-sm text-sm truncate"
                  >
                    {profiles.map((p, i) => (
                       <option key={i} value={p.name}>{p.name} — {p.targetIDE}</option>
                    ))}
                  </select>
                  <Code2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-400" />
                  <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-zinc-500">
                    ▼
                  </div>
                </div>
              </div>

              <div className="bg-indigo-500/10 border border-indigo-500/20 p-5 rounded-2xl flex items-start gap-4">
                <CheckCircle2 className="w-6 h-6 text-indigo-400 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-medium text-indigo-100 text-sm">Engine Status: Online</h3>
                  <p className="text-xs text-indigo-300/70 mt-1 leading-relaxed">
                    Accessibility Services and Draw Overlays are functioning. Waiting for widget launch.
                  </p>
                </div>
              </div>

              <button 
                onClick={handleInitializeOverlay}
                className="max-w-md w-full group py-3.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-500 transition-all flex items-center justify-center gap-2 overflow-hidden relative shadow-sm border border-indigo-500 hover:border-indigo-400"
              >
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>
                <Play className="w-4 h-4 fill-current" />
                <span className="relative z-10">Initialize Synapse Overlay</span>
              </button>
            </div>
          )}

          {/* AGENTS TAB */}
          {activeTab === 'Agents' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="space-y-4">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">Create New Profile</h3>
                
                <input 
                  type="text" 
                  placeholder="Profile Name (e.g., Python Expert)"
                  value={newProfileName}
                  onChange={(e) => setNewProfileName(e.target.value)}
                  className="w-full p-4 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-100 outline-none focus:border-indigo-500 transition-colors placeholder:text-zinc-600 shadow-inner"
                />
                
                <div className="relative">
                  <select 
                    value={newProfileIDE}
                    onChange={(e) => setNewProfileIDE(e.target.value)}
                    className="w-full p-4 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-100 outline-none focus:border-indigo-500 transition-colors appearance-none shadow-inner"
                  >
                    <option disabled value="">Select Target IDE / App</option>
                    {IDE_OPTIONS.map((ide) => (
                      <option key={ide} value={ide}>{ide}</option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-zinc-500">
                    ▼
                  </div>
                </div>

                <textarea 
                  placeholder="System Prompt (Define behavior & output style...)"
                  value={newProfilePrompt}
                  onChange={(e) => setNewProfilePrompt(e.target.value)}
                  rows={3}
                  className="w-full p-4 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-100 outline-none focus:border-indigo-500 transition-colors resize-none placeholder:text-zinc-600 shadow-inner"
                />
                
                <button 
                  onClick={handleSaveProfile}
                  className="w-full py-3.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-medium rounded-xl transition-colors flex justify-center items-center gap-2 border border-zinc-700"
                >
                  <Plus className="w-4 h-4" /> Save Configuration
                </button>
              </div>

              <div className="pt-6 border-t border-zinc-800/50">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 mb-4">Saved Configurations</h3>
                <div className="space-y-3">
                  {profiles.map((profile, idx) => (
                    <div key={idx} className="p-4 bg-zinc-900/50 border border-zinc-800/80 rounded-xl flex items-center justify-between group hover:border-indigo-500/50 transition-colors">
                      <div>
                        <h4 className="text-zinc-200 font-medium">{profile.name}</h4>
                        <div className="flex items-center gap-1.5 mt-1 text-xs text-zinc-500">
                          <Terminal className="w-3 h-3" />
                          <span>{profile.targetIDE}</span>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleDeleteProfile(idx)}
                        className="p-2 text-zinc-600 hover:text-red-400 transition-colors"
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* SETTINGS TAB */}
          {activeTab === 'Settings' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="space-y-4">
                 <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">API Configuration</h3>
                <input 
                  type="password" 
                  placeholder="API Key (sk-...)"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full p-4 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-100 outline-none focus:border-indigo-500 transition-colors placeholder:text-zinc-600"
                />
                <input 
                  type="text" 
                  placeholder="Base URL (Optional)"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  className="w-full p-4 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-100 outline-none focus:border-indigo-500 transition-colors placeholder:text-zinc-600"
                />
                <input 
                  type="text" 
                  placeholder="Model Selection (e.g. gpt-4o)"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full p-4 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-100 outline-none focus:border-indigo-500 transition-colors placeholder:text-zinc-600"
                />
              </div>

              <button 
                  onClick={handleSaveSettings}
                  className="w-full py-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-medium rounded-xl transition-colors flex justify-center items-center gap-2 border border-zinc-700 mt-6"
                >
                  <CheckCircle2 className="w-4 h-4" /> Save API Settings
              </button>

              <div className="pt-6 border-t border-zinc-800/50 mt-6 space-y-4">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 mb-2">Native Android Permissions</h3>
                
                {/* Overlay Permission Card */}
                <div className="bg-zinc-900/50 border border-zinc-800/80 p-4 rounded-xl space-y-3">
                  <div>
                    <h4 className="text-zinc-200 font-medium text-sm flex items-center gap-2">
                       <Smartphone className="w-4 h-4 text-indigo-400" />
                       Draw Over Other Apps
                    </h4>
                    <p className="text-xs text-zinc-500 mt-1.5 leading-relaxed">
                      Required to display the floating assistant while you are inside another app (like Dcoder or HopWeb). <br/>
                      <span className="text-[10px] text-zinc-600 font-mono mt-1 block">Requires: SYSTEM_ALERT_WINDOW</span>
                    </p>
                  </div>
                  <button 
                    onClick={handleRequestPermission}
                    className="w-full py-2.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 text-sm font-medium rounded-lg transition-colors flex justify-center items-center border border-indigo-500/20"
                  >
                    Grant Overlay Permission
                  </button>
                </div>

                {/* Accessibility Permission Card */}
                <div className="bg-zinc-900/50 border border-zinc-800/80 p-4 rounded-xl space-y-3">
                  <div>
                    <h4 className="text-zinc-200 font-medium text-sm flex items-center gap-2">
                       <Code2 className="w-4 h-4 text-indigo-400" />
                       Accessibility Service
                    </h4>
                    <p className="text-xs text-zinc-500 mt-1.5 leading-relaxed">
                      Required for the agent to simulate typing and inject the generated code directly into your target IDE's editor screen. <br/>
                      <span className="text-[10px] text-zinc-600 font-mono mt-1 block">Requires: BIND_ACCESSIBILITY_SERVICE</span>
                    </p>
                  </div>
                  <button 
                    onClick={handleRequestAccessibility}
                    className="w-full py-2.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 text-sm font-medium rounded-lg transition-colors flex justify-center items-center border border-indigo-500/20"
                  >
                    Grant Accessibility Permission
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Simulated Floating Widget (Overlayed on OS) */}
      {isWidgetOpen && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"></div> {/* App background dimming */}
          
          {/* Draggable Widget Simulation */}
          <div 
            className="pointer-events-auto absolute top-32 right-8 z-50 w-[300px]"
            style={{ transform: `translate(${widgetPos.x}px, ${widgetPos.y}px)` }}
          >
            <div className="w-full bg-[#0c0c0e] border border-zinc-700/80 rounded-lg shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in duration-300">
               
               {/* Header */}
               <div className="bg-zinc-900 px-2 py-2 flex justify-between items-center border-b border-zinc-800">
                <div className="flex items-center gap-2">
                  <button 
                    className={`p-1.5 rounded-md transition-colors touch-none ${isDragging ? 'bg-indigo-500/20 text-indigo-400 cursor-grabbing' : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 cursor-grab'}`}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerUp}
                    title="Drag to move"
                  >
                    <Move className="w-4 h-4" />
                  </button>
                  <span className="text-zinc-200 text-xs font-semibold tracking-wide">Synapse Overlay</span>
                </div>
                <button onClick={() => setIsWidgetOpen(false)} className="text-zinc-500 hover:text-white transition-colors p-1.5 rounded-md hover:bg-zinc-800">
                  <span className="sr-only">Close</span>
                  <X className="w-4 h-4" />
                </button>
             </div>

               {/* Profile Indicator */}
               <div className="px-3 pt-2">
                 <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-[10px] text-indigo-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"></span>
                    {selectedHomeProfile || "General"}
                 </div>
               </div>
               
               {/* Body */}
               <div className="p-3 pt-2 flex flex-col gap-3">
                  
                  {messages.length > 0 && (
                    <div className="max-h-[180px] overflow-y-auto custom-scrollbar flex flex-col gap-3 pr-1">
                      {messages.map(msg => (
                        <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                          {msg.role === 'agent' && (
                            <span className="text-[9px] text-indigo-400 mb-1 font-medium tracking-wide flex items-center gap-1 max-w-full">
                              <Cpu className="w-3 h-3 shrink-0" /> <span className="truncate">{msg.profile}</span>
                            </span>
                          )}
                          <div className={`p-2.5 rounded-xl text-xs leading-relaxed max-w-[90%] shadow-sm group relative ${
                            msg.role === 'user' 
                              ? 'bg-zinc-800 text-zinc-200 rounded-tr-sm border border-zinc-700/50' 
                              : 'bg-indigo-500/10 border border-indigo-500/20 text-indigo-100 rounded-tl-sm'
                          }`}>
                            {msg.isLoading ? (
                              <div className="flex items-center gap-1 h-4 px-1">
                                <span className="w-1.5 h-1.5 bg-indigo-400/80 rounded-full animate-bounce"></span>
                                <span className="w-1.5 h-1.5 bg-indigo-400/80 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                <span className="w-1.5 h-1.5 bg-indigo-400/80 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                              </div>
                            ) : (
                              <>
                                <div className="whitespace-pre-wrap pr-6">{msg.text}</div>
                                {msg.role === 'agent' && (
                                  <button
                                    onClick={() => handleCopy(msg.id, msg.text)}
                                    className="absolute top-2 right-2 p-1.5 rounded-md bg-zinc-800/90 text-zinc-400 hover:text-white opacity-0 group-hover:opacity-100 transition-all shadow-sm border border-zinc-700/50 focus:opacity-100"
                                    title="Copy to clipboard"
                                  >
                                    {copiedId === msg.id ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                  )}

                  <div className="relative shrink-0">
                    <textarea 
                      value={widgetInput}
                      onChange={(e) => setWidgetInput(e.target.value)}
                      className={`w-full ${messages.length > 0 ? 'h-12' : 'h-24'} text-xs p-2.5 pr-8 bg-black/40 border border-zinc-800 rounded-lg resize-none text-zinc-200 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all placeholder:text-zinc-600 custom-scrollbar`}
                      placeholder={messages.length > 0 ? "Reply..." : "Describe code to generate..."}
                    />
                    {widgetInput && (
                      <button 
                        onClick={() => setWidgetInput('')}
                        className="absolute top-2 right-2 p-1 bg-zinc-800/80 hover:bg-zinc-700 rounded-md text-zinc-400 hover:text-white transition-colors"
                        title="Clear input"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 shrink-0">
                    <button 
                      onClick={simulateTyping}
                      disabled={isSimulatingTyping}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] py-2 rounded-lg font-medium disabled:opacity-50 transition-colors flex flex-col items-center justify-center gap-1"
                    >
                      <MessageSquareCode className="w-3.5 h-3.5" />
                      {isSimulatingTyping ? 'Injecting...' : 'Inject Code'}
                    </button>
                    <button 
                      onClick={simulateReply}
                      className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 hover:text-white text-[10px] py-2 rounded-lg font-medium transition-colors flex flex-col items-center justify-center gap-1"
                    >
                      <Terminal className="w-3.5 h-3.5" />
                      Overlay Reply
                    </button>
                  </div>
               </div>
              </div>
            </div>
          </div>
        )}

    </div>
  );
}
