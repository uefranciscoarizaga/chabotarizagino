import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, User, Mic, MicOff, Settings, Trash2, Download, Moon, Sun, Zap, Brain, Lightbulb } from 'lucide-react';
import { getEventsForCurrentMonth, getEventsByCategory, getUpcomingEvents, searchEventsByTitle, getAllEvents, Event, getHorarioCursoByGrado, getHorarioDocenteByNombre, HorarioCurso, HorarioDocente, getAllHorariosCurso, getAllHorariosDocente, getAllCustomCommands, CustomCommand as SCustomCommand } from './lib/supabase';
import { Mistral } from '@mistralai/mistralai';
import { AdminPanel } from './components/AdminPanel';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  typing?: boolean;
  emoji?: string;
  category?: string;
}

const mistralClient = new Mistral({
  apiKey: 'fSejNjPr3mGW1DxZtSZWXwTKaPKs3waX'
});

function App() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: '¡Hola! Soy Iris, tu asistente virtual impulsado por Mistral IA. Puedo ayudarte respondiendo cualquier pregunta',
      sender: 'bot',
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const commands = [
    { text: '/eventos deportivos', icon: '⚽', description: 'Ver eventos deportivos' },
    { text: '/próximos eventos', icon: '⏰', description: 'Próximos 7 días' },
    { text: '/eventos de este mes', icon: '📅', description: 'Eventos del mes actual' },
    { text: '/eventos académicos', icon: '📚', description: 'Eventos académicos' },
    { text: '/eventos culturales', icon: '🎭', description: 'Eventos culturales' },
    { text: '/eventos sociales', icon: '🎉', description: 'Eventos sociales' },
    { text: '/eventos ceremoniales', icon: '🎓', description: 'Eventos ceremoniales' },
    { text: '/eventos', icon: '📋', description: 'Todos los eventos' },
    { text: '/horario', icon: '🗓️', description: 'Consultar horarios de curso o docente' }
  ];

  const [horariosCurso, setHorariosCurso] = useState<HorarioCurso[]>([]);
  const [horariosDocente, setHorariosDocente] = useState<HorarioDocente[]>([]);
  const [customCommands, setCustomCommands] = useState<SCustomCommand[]>([]);

  useEffect(() => {
    // Cargar listas de horarios para el autocompletado del dropdown
    (async () => {
      try {
        const [cursos, docentes, customs] = await Promise.all([
          getAllHorariosCurso(),
          getAllHorariosDocente(),
          getAllCustomCommands()
        ]);
        setHorariosCurso(cursos || []);
        setHorariosDocente(docentes || []);
        setCustomCommands(customs || []);
      } catch (e) {
        console.error('Error cargando listas de horarios:', e);
      }
    })();
  }, []);

  const filteredCommands = React.useMemo(() => {
    const input = inputText.trim();
    if (!input.startsWith('/')) return [];
    const lower = input.toLowerCase();

    if (lower.startsWith('/horario')) {
      const rest = lower.replace('/horario', '').trim();

      if (rest === '') {
        return [
          { text: '/horario curso', icon: '🗓️', description: 'Buscar horario por curso' },
          { text: '/horario docente', icon: '👩‍🏫', description: 'Buscar horario por docente' }
        ];
      }

      if (rest.startsWith('curso')) {
        const query = rest.replace('curso', '').trim();
        const items = (horariosCurso || []).map(h => ({
          text: `/horario curso ${h.grado}`,
          icon: '🗓️',
          description: `${h.ano_electivo}${h.pdf_url ? ' • PDF' : ''}`
        }));
        return query ? items.filter(i => i.text.toLowerCase().includes(query)) : items;
      }

      if (rest.startsWith('docente')) {
        const query = rest.replace('docente', '').trim();
        const items = (horariosDocente || []).map(h => ({
          text: `/horario docente ${h.nombre_docente}`,
          icon: '👩‍🏫',
          description: `${h.ano_electivo}${h.pdf_url ? ' • PDF' : ''}`
        }));
        return query ? items.filter(i => i.text.toLowerCase().includes(query)) : items;
      }
    }

    const needle = lower.substring(1);
    const mappedCustoms = (customCommands || []).map(cc => ({
      text: `/${cc.command}`,
      icon: cc.icon || '✨',
      description: cc.description || 'Comando personalizado'
    }));
    const all = [...commands, ...mappedCustoms];
    return all.filter(cmd => cmd.text.toLowerCase().includes(needle));
  }, [inputText, commands, horariosCurso, horariosDocente, customCommands]);

  // Función para formatear eventos
  const formatEventsResponse = (events: Event[], title: string): string => {
    if (events.length === 0) {
      return `Al parecer no hay ningún evento ${title.toLowerCase()}.`;
    }

    let response = `📅 **${title}**\n\n`;
    events.forEach((event, index) => {
      const eventDate = new Date(event.date);
      const formattedDate = eventDate.toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      
      response += `${index + 1}. **${event.title}**\n`;
      response += `   📍 Lugar: ${event.location}\n`;
      response += `   🕐 Hora: ${event.time}\n`;
      response += `   📆 Fecha: ${formattedDate}\n`;
      response += `   🏷️ Categoría: ${event.category}\n\n`;
    });

    return response;
  };

  // Formatear respuesta de horario de curso
  const formatHorarioCursoResponse = (horario: HorarioCurso): string => {
    return [
      `🗓️ Horario del curso ${horario.grado}`,
      `Año electivo: ${horario.ano_electivo}`,
      horario.pdf_url ? `PDF: ${horario.pdf_url}` : ''
    ].filter(Boolean).join('\n');
  };

  // Formatear respuesta de horario de docente
  const formatHorarioDocenteResponse = (horario: HorarioDocente): string => {
    return [
      `👩‍🏫 Horario de ${horario.nombre_docente}`,
      `Año electivo: ${horario.ano_electivo}`,
      horario.pdf_url ? `PDF: ${horario.pdf_url}` : ''
    ].filter(Boolean).join('\n');
  };

  // Utils de normalización para coincidencias tolerantes (acentos, guiones, espacios)
  const normalize = (s: string) => s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/gi, '');

  // Intentar encontrar curso por texto en memoria o BD como respaldo
  const findCursoByText = async (texto: string): Promise<HorarioCurso | null> => {
    const target = normalize(texto);
    const local = horariosCurso.find(h => normalize(h.grado).includes(target) || target.includes(normalize(h.grado)));
    if (local) return local;
    try {
      const all = await getAllHorariosCurso();
      return (all || []).find(h => normalize(h.grado).includes(target) || target.includes(normalize(h.grado))) || null;
    } catch {
      return null;
    }
  };

  // Intentar encontrar docente por texto en memoria o BD como respaldo
  const findDocenteByText = async (texto: string): Promise<HorarioDocente | null> => {
    const target = normalize(texto);
    const local = horariosDocente.find(h => normalize(h.nombre_docente).includes(target) || target.includes(normalize(h.nombre_docente)));
    if (local) return local;
    try {
      const all = await getAllHorariosDocente();
      return (all || []).find(h => normalize(h.nombre_docente).includes(target) || target.includes(normalize(h.nombre_docente))) || null;
    } catch {
      return null;
    }
  };

  // Función para manejar comandos con slash (/)
  const handleSlashCommand = async (input: string): Promise<string | null> => {
    const normalizedInput = input.toLowerCase().trim();
    
    try {
      setIsLoadingEvents(true);
      
      // Verificar comandos personalizados
      const customCommandMatch = (customCommands || []).find(cc => {
        const commandPattern = `/${cc.command}`.toLowerCase();
        return normalizedInput === commandPattern || normalizedInput.startsWith(commandPattern + ' ');
      });

      if (customCommandMatch) {
        // Procesar el comando personalizado
        if (customCommandMatch.response_type === 'text') {
          return customCommandMatch.content;
        } else if (customCommandMatch.response_type === 'link') {
          // Formato: "redirect|url" o "download|url"
          const [linkType, url] = customCommandMatch.content.split('|');
          if (linkType === 'download') {
            return `📥 **${customCommandMatch.description}**\n\nDescarga: [${url}](${url})`;
          } else {
            return `🔗 **${customCommandMatch.description}**\n\nEnlace: [${url}](${url})`;
          }
        }
        return customCommandMatch.content;
      }
      
      // Horario de curso: /horario curso <grado>
      const matchCurso = normalizedInput.match(/^\/horario\s+curso\s+(.+)$/i);
      if (matchCurso) {
        const grado = matchCurso[1].trim();
        // Primero intento directo por BD, luego búsqueda tolerante
        let horario = await getHorarioCursoByGrado(grado);
        if (!horario) {
          horario = await findCursoByText(grado);
        }
        if (!horario) {
          return `No encontré un horario para el curso "${grado}".`;
        }
        return formatHorarioCursoResponse(horario);
      }

      // Horario de docente: /horario docente <nombre>
      const matchDocente = normalizedInput.match(/^\/horario\s+docente\s+(.+)$/i);
      if (matchDocente) {
        const nombre = matchDocente[1].trim();
        // Primero intento directo por BD, luego búsqueda tolerante
        let horario = await getHorarioDocenteByNombre(nombre);
        if (!horario) {
          horario = await findDocenteByText(nombre);
        }
        if (!horario) {
          return `No encontré un horario para el docente "${nombre}".`;
        }
        return formatHorarioDocenteResponse(horario);
      }

      // Ayuda de /horario
      if (normalizedInput === '/horario') {
        return 'Usa:\n- /horario curso <grado> (ej: /horario curso 8-B)\n- /horario docente <nombre> (ej: /horario docente Juan García)';
      }
      
      // Eventos deportivos
      if (normalizedInput.includes('/eventos deportivos') || normalizedInput.includes('/deportivos')) {
        const events = await getEventsByCategory('deportivo');
        return formatEventsResponse(events, 'Eventos Deportivos') + ' 🏆';
      }

      // Próximos eventos
      if (normalizedInput.includes('/próximos eventos') || normalizedInput.includes('/proximos eventos')) {
        const events = await getUpcomingEvents();
        return formatEventsResponse(events, 'Próximos eventos (próximos 7 días)') + ' ⏰';
      }

      // Eventos de este mes
      if (normalizedInput.includes('/eventos de este mes') || normalizedInput.includes('/eventos del mes')) {
        const events = await getEventsForCurrentMonth();
        const monthName = new Date().toLocaleDateString('es-ES', { month: 'long' });
        return formatEventsResponse(events, `Eventos para ${monthName}`) + ' 📆';
      }

      // Eventos académicos
      if (normalizedInput.includes('/eventos académicos') || normalizedInput.includes('/academicos')) {
        const events = await getEventsByCategory('academico');
        return formatEventsResponse(events, 'Eventos Académicos') + ' 📚';
      }

      // Eventos culturales
      if (normalizedInput.includes('/eventos culturales') || normalizedInput.includes('/culturales')) {
        const events = await getEventsByCategory('cultural');
        return formatEventsResponse(events, 'Eventos Culturales') + ' 🎭';
      }

      // Eventos sociales
      if (normalizedInput.includes('/eventos sociales') || normalizedInput.includes('/sociales')) {
        const events = await getEventsByCategory('social');
        return formatEventsResponse(events, 'Eventos Sociales') + ' 🎉';
      }

      // Eventos ceremoniales
      if (normalizedInput.includes('/eventos ceremoniales') || normalizedInput.includes('/ceremoniales')) {
        const events = await getEventsByCategory('ceremonial');
        return formatEventsResponse(events, 'Eventos Ceremoniales') + ' 🎓';
      }

      // Todos los eventos
      if (normalizedInput === '/eventos' || normalizedInput === '/todos los eventos') {
        const events = await getAllEvents();
        return formatEventsResponse(events, 'Todos los eventos programados') + ' 📋';
      }

    } catch (error) {
      console.error('Error fetching events:', error);
      return '❌ Lo siento, hubo un problema al consultar los eventos. Por favor, intenta nuevamente.';
    } finally {
      setIsLoadingEvents(false);
    }

    return null;
  };

  // Función para consultar Mistral IA
  const getMistralResponse = async (userMessage: string): Promise<string> => {
    try {
      const response = await mistralClient.chat.complete({
        model: 'mistral-small',
        messages: [
          {
            role: 'system',
            content: 'Eres Iris, un asistente virtual amigable y profesional del Colegio Arizagino. Tu nombre es Iris. Siempre responde en español de manera clara, concisa y helpful. Cuando alguien te pregunta tu nombre, responde que eres Iris.'
          },
          {
            role: 'user',
            content: userMessage
          }
        ]
      });

      return response.choices[0].message.content;
    } catch (error) {
      console.error('Error with Mistral API:', error);
      return 'Lo siento, hubo un error al procesar tu pregunta. Por favor, intenta nuevamente.';
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Función para enviar un mensaje específico (usado para los comandos del dropdown)
  const sendMessage = async (messageText: string) => {
    if (!messageText.trim()) return;

    // Verificar si es el comando /admin
    if (messageText.trim().toLowerCase() === '/admin') {
      setShowAdminPanel(true);
      setInputText('');
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      text: messageText,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsTyping(true);

    try {
      let botResponse: string = '';

      // Verificar si es un comando con /
      if (messageText.trim().startsWith('/')) {
        const slashResponse = await handleSlashCommand(messageText);
        if (slashResponse) {
          botResponse = slashResponse;
        } else {
          botResponse = 'No reconozco ese comando. Intenta con: /eventos deportivos, /próximos eventos, /eventos de este mes';
        }
      } else {
        // Consultar Mistral IA para mensajes normales
        botResponse = await getMistralResponse(messageText);
      }

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: botResponse,
        sender: 'bot',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, botMessage]);
      setIsTyping(false);
    } catch (error) {
      console.error('Error sending message:', error);
      setIsTyping(false);
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: 'Lo siento, ocurrió un error. Por favor intenta nuevamente.',
        sender: 'bot',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  const handleSendMessage = async () => {
    await sendMessage(inputText);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const clearChat = () => {
    setMessages([{
      id: '1',
      text: '¡Hola! Soy Iris, tu asistente virtual impulsado por Mistral IA. ¿En qué puedo ayudarte?',
      sender: 'bot',
      timestamp: new Date()
    }]);
  };

  const exportChat = () => {
    const chatText = messages.map(msg => 
      `[${msg.timestamp.toLocaleTimeString()}] ${msg.sender === 'user' ? 'Tú' : 'Bot'}: ${msg.text}`
    ).join('\n');
    
    const blob = new Blob([chatText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'chat-conversation.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const startVoiceRecognition = () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.lang = 'es-ES';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputText(transcript);
        setIsListening(false);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } else {
      alert('Tu navegador no soporta reconocimiento de voz');
    }
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      darkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-blue-50 via-white to-purple-50'
    }`}>
      {/* Background blobs */}
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-24 -left-24 w-72 h-72 bg-gradient-to-br from-blue-400 to-purple-500 opacity-20 blur-3xl rounded-full animate-pulse" />
        <div className="absolute top-1/3 -right-24 w-80 h-80 bg-gradient-to-br from-pink-400 to-purple-600 opacity-20 blur-3xl rounded-full animate-pulse" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-gradient-to-br from-indigo-400 to-cyan-500 opacity-10 blur-3xl rounded-full animate-pulse" />
      </div>
      {/* Admin Panel Modal */}
      <AdminPanel isOpen={showAdminPanel} onClose={() => {
        setShowAdminPanel(false);
        // Recargar comandos personalizados cuando se cierre el panel
        (async () => {
          const customs = await getAllCustomCommands();
          setCustomCommands(customs || []);
        })();
      }} darkMode={darkMode} />
      {/* Header */}
      <header className={`${
        darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white/80 border-gray-200'
      } group backdrop-blur-md border-b sticky top-0 z-50 transition-colors duration-300 relative`}>
        {/* light underline on hover */}
        <div aria-hidden className="absolute bottom-0 left-0 right-0 h-[2px] opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-r from-transparent via-purple-400/50 to-transparent" />
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <Bot className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                ChatBot Arizagino
              </h1>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Iris • Asistente Virtual con Mistral AI
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`relative p-2 rounded-lg transition-colors ${
                darkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-600'
              }`}
            >
              <span aria-hidden className="absolute -inset-1 rounded-lg bg-gradient-to-r from-yellow-300/0 to-purple-400/0 blur-lg opacity-0 hover:opacity-30 transition-opacity" />
              {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`relative p-2 rounded-lg transition-colors ${
                darkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-600'
              }`}
            >
              <span aria-hidden className="absolute -inset-1 rounded-lg bg-gradient-to-r from-blue-400/0 to-pink-400/0 blur-lg opacity-0 hover:opacity-30 transition-opacity" />
              <Settings className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Settings Panel */}
      {showSettings && (
        <div className={`${
          darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        } border-b transition-colors duration-300`}>
          <div className="max-w-4xl mx-auto px-4 py-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={clearChat}
                className="flex items-center space-x-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
                <span>Limpiar Chat</span>
              </button>
              <button
                onClick={exportChat}
                className="flex items-center space-x-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
              >
                <Download className="h-4 w-4" />
                <span>Exportar</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chat Container */}
      <div className="max-w-4xl mx-auto px-4 py-6 relative">
        {/* Glow halo behind chat card */}
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <div className="mx-auto max-w-4xl">
            <div className="relative">
              <div className="absolute -inset-6 rounded-3xl bg-gradient-to-r from-blue-500/20 via-purple-500/15 to-pink-500/20 blur-2xl animate-pulse" />
            </div>
          </div>
        </div>
        <div className={`${
          darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        } rounded-2xl shadow-xl border transition-colors duration-300 overflow-hidden transition-all hover:ring-2 hover:ring-purple-400/30 hover:shadow-[0_0_40px_rgba(168,85,247,0.25)]`}>
          
          {/* Messages Area */}
          <div className="h-[500px] overflow-y-auto p-6 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex items-start space-x-3 ${
                  message.sender === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  message.sender === 'user'
                    ? 'bg-blue-500'
                    : 'bg-gradient-to-r from-purple-500 to-pink-500'
                }`}>
                  {message.sender === 'user' ? (
                    <User className="h-4 w-4 text-white" />
                  ) : (
                    <Bot className="h-4 w-4 text-white" />
                  )}
                </div>
                
                <div className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl transform transition-transform ${
                  message.sender === 'user'
                    ? 'bg-blue-500 text-white hover:-translate-y-0.5'
                    : darkMode
                    ? 'bg-gray-700 text-gray-100 hover:-translate-y-0.5'
                    : 'bg-gray-100 text-gray-900 hover:-translate-y-0.5'
                }`}>
                  {(() => {
                    const isBot = message.sender === 'bot';
                    const pdfMatch = isBot ? message.text.match(/^PDF:\s*(https?:\/\/\S+)/m) : null;
                    const pdfUrl = pdfMatch ? pdfMatch[1] : null;
                    const displayText = pdfUrl ? message.text.replace(/^PDF:\s*https?:\/\/\S+\s*/m, '').trim() : message.text;
                    return (
                      <>
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{displayText}</p>
                        {pdfUrl && (
                          <a
                            href={pdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`inline-flex items-center mt-2 px-3 py-2 rounded-lg text-sm font-medium ${
                              message.sender === 'user'
                                ? 'bg-white/20 text-white hover:bg-white/30'
                                : darkMode
                                ? 'bg-blue-600 hover:bg-blue-500 text-white'
                                : 'bg-blue-500 hover:bg-blue-600 text-white'
                            }`}
                          >
                            Descargar PDF
                          </a>
                        )}
                      </>
                    );
                  })()}
                  <p className={`text-xs mt-1 ${
                    message.sender === 'user'
                      ? 'text-blue-100'
                      : darkMode
                      ? 'text-gray-400'
                      : 'text-gray-500'
                  }`}>
                    {message.timestamp.toLocaleTimeString('es-ES', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </p>
                </div>
              </div>
            ))}
            
            {isTyping && (
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-white" />
                </div>
                <div className={`px-4 py-3 rounded-2xl ${
                  darkMode ? 'bg-gray-700' : 'bg-gray-100'
                }`}>
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className={`${
            darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
          } border-t p-4 transition-colors duration-300`}>
            <div className="flex items-center space-x-3">
              <div className="relative">
                {isListening && (
                  <span className="absolute inset-0 rounded-full animate-ping bg-red-500/30" />
                )}
                <button
                  onClick={startVoiceRecognition}
                  disabled={isListening}
                  className={`relative p-3 rounded-full transition-colors ${
                    isListening
                      ? 'bg-red-500 text-white'
                      : darkMode
                      ? 'bg-gray-600 hover:bg-gray-500 text-gray-300'
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-600'
                  }`}
                >
                  {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                </button>
              </div>
              
              <div className="flex-1 relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputText}
                  onChange={(e) => {
                    setInputText(e.target.value);
                    setShowCommandPalette(e.target.value.startsWith('/'));
                  }}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && showCommandPalette && filteredCommands.length > 0) {
                      e.preventDefault();
                      setInputText(filteredCommands[0].text);
                      setShowCommandPalette(false);
                      return;
                    }
                    handleKeyPress(e);
                  }}
                  placeholder="Escribe tu mensaje aquí... (usa / para comandos)"
                  className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-400/70 shadow-[0_0_0_rgba(0,0,0,0)] focus:shadow-[0_0_25px_rgba(59,130,246,0.25)] transition-all ${
                    darkMode
                      ? 'bg-gray-600 border-gray-500 text-white placeholder-gray-400'
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  }`}
                />

                {/* Command Palette - Estilo Discord */}
                {showCommandPalette && filteredCommands.length > 0 && (
                  <div className={`absolute bottom-full mb-2 w-full rounded-lg shadow-lg z-50 overflow-hidden ${
                    darkMode ? 'bg-gray-700 border border-gray-600' : 'bg-white border border-gray-200'
                  }`}>
                    <div className="max-h-64 overflow-y-auto">
                      {filteredCommands.map((cmd, index) => (
                        <button
                          key={index}
                          onClick={() => {
                            // Rellenar el input con la sugerencia, pero NO enviar automáticamente
                            setInputText(cmd.text);
                            setShowCommandPalette(false);
                            // Mantener el foco en el input para que el usuario pueda editar o presionar Enter
                            setTimeout(() => inputRef.current?.focus(), 0);
                          }}
                          className={`w-full px-4 py-3 text-left transition-colors flex items-center space-x-3 ${
                            darkMode
                              ? 'hover:bg-gray-600 text-gray-100'
                              : 'hover:bg-blue-50 text-gray-900'
                          }`}
                        >
                          <span className="text-xl">{cmd.icon}</span>
                          <div className="flex-1">
                            <p className="font-semibold text-sm">{cmd.text}</p>
                            <p className={`text-xs ${
                              darkMode ? 'text-gray-400' : 'text-gray-500'
                            }`}>{cmd.description}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              <button
                onClick={handleSendMessage}
                disabled={!inputText.trim() || isTyping}
                className="p-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors transform transition-transform hover:scale-105 active:scale-95"
              >
                <Send className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="mt-8 grid md:grid-cols-3 gap-6">
          <div className={`${
            darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          } p-6 rounded-xl border transition-colors duration-300`}>
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center mb-4">
              <Brain className="h-6 w-6 text-white" />
            </div>
            <h3 className={`text-lg font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Mistral IA
            </h3>
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Impulsado por Mistral AI para responder cualquier pregunta con precisión y contexto.
            </p>
          </div>

          <div className={`${
            darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          } p-6 rounded-xl border transition-colors duration-300`}>
            <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-teal-600 rounded-lg flex items-center justify-center mb-4">
              <Zap className="h-6 w-6 text-white" />
            </div>
            <h3 className={`text-lg font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Comandos Rápidos
            </h3>
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Usa comandos con "/" para acceder rápidamente a eventos y actividades específicas.
            </p>
          </div>

          <div className={`${
            darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          } p-6 rounded-xl border transition-colors duration-300`}>
            <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-600 rounded-lg flex items-center justify-center mb-4">
              <Lightbulb className="h-6 w-6 text-white" />
            </div>
            <h3 className={`text-lg font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Base de Datos
            </h3>
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Acceso a información completa sobre eventos académicos, culturales, deportivos y más.
            </p>
          </div>
        </div>

        {/* Información de la Institución */}
        <div className="mt-8">
          <div className={`${
            darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          } p-6 rounded-xl border transition-colors duration-300`}>
            <div className="text-center">
              <h3 className={`text-lg font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                🏫 Institución Educativa Dr. F. Arízaga Luque
              </h3>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Consulta información sobre eventos académicos, culturales, deportivos, sociales y ceremoniales de nuestra institución usando comandos con "/".
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {['📚 Académicos', '🎭 Culturales', '⚽ Deportivos', '🎉 Sociales', '🎓 Ceremoniales'].map((category, index) => (
                  <span
                    key={index}
                    className={`px-3 py-1 rounded-full text-xs ${
                      darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {category}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
