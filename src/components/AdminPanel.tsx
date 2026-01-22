import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Edit2, Upload } from 'lucide-react';
import {
  getAllHorariosCurso,
  addHorarioCurso,
  deleteHorarioCurso,
  getAllHorariosDocente,
  addHorarioDocente as supaAddHorarioDocente,
  deleteHorarioDocente as supaDeleteHorarioDocente,
  getAllCustomCommands,
  addCustomCommand as supaAddCustomCommand,
  deleteCustomCommand,
  HorarioCurso as SHorarioCurso,
  HorarioDocente as SHorarioDocente,
  CustomCommand as SCustomCommand,
  supabase
} from '../lib/supabase';

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  darkMode: boolean;
}

interface CustomCommand {
  id: string;
  command: string;
  description: string;
  icon: string;
  responseType: 'horario' | 'link' | 'text';
  content: string;
  createdAt: Date;
}

interface Horario {
  id: string;
  grado: string;
  anoElectivo: string;
  pdfUrl: string;
  createdAt: Date;
}

interface HorarioDocente {
  id: string;
  nombreDocente: string;
  anoElectivo: string;
  pdfUrl: string;
  createdAt: Date;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ isOpen, onClose, darkMode }) => {
  const [activeTab, setActiveTab] = useState<'commands' | 'horarios' | 'docentes'>('commands');
  const [commands, setCommands] = useState<CustomCommand[]>([]);
  const [horarios, setHorarios] = useState<Horario[]>([]);
  const [horariosDocentes, setHorariosDocentes] = useState<HorarioDocente[]>([]);
  
  // Form state - Commands
  const [newCommand, setNewCommand] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newIcon, setNewIcon] = useState('');
  const [newContent, setNewContent] = useState('');
  const [responseType, setResponseType] = useState<'text' | 'link' | 'horario'>('text');
  const [linkMode, setLinkMode] = useState<'download' | 'redirect'>('redirect');
  const [editingCommandId, setEditingCommandId] = useState<string | null>(null);

  // Form state - Horarios
  const [newGrado, setNewGrado] = useState('');
  const [newAnoElectivo, setNewAnoElectivo] = useState('');
  const [newPdfUrl, setNewPdfUrl] = useState('');
  const [editingHorarioId, setEditingHorarioId] = useState<string | null>(null);

  // Form state - Horarios Docentes
  const [newNombreDocente, setNewNombreDocente] = useState('');
  const [newAnoElectivoDocente, setNewAnoElectivoDocente] = useState('');
  const [newPdfUrlDocente, setNewPdfUrlDocente] = useState('');
  const [editingDocenteId, setEditingDocenteId] = useState<string | null>(null);

  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // Mappers
  const mapHorarioCursoToLocal = (h: SHorarioCurso): Horario => ({
    id: h.id,
    grado: h.grado,
    anoElectivo: h.ano_electivo,
    pdfUrl: h.pdf_url,
    createdAt: h.created_at ? new Date(h.created_at) : new Date(),
  });
  const mapHorarioDocenteToLocal = (h: SHorarioDocente): HorarioDocente => ({
    id: h.id,
    nombreDocente: h.nombre_docente,
    anoElectivo: h.ano_electivo,
    pdfUrl: h.pdf_url,
    createdAt: h.created_at ? new Date(h.created_at) : new Date(),
  });
  const mapCommandToLocal = (c: SCustomCommand): CustomCommand => ({
    id: c.id,
    command: c.command,
    description: c.description,
    icon: c.icon,
    responseType: c.response_type,
    content: c.content,
    createdAt: c.created_at ? new Date(c.created_at) : new Date(),
  });

  const loadAll = async () => {
    try {
      const [cmds, cursos, docentes] = await Promise.all([
        getAllCustomCommands(),
        getAllHorariosCurso(),
        getAllHorariosDocente(),
      ]);
      setCommands((cmds || []).map(mapCommandToLocal));
      setHorarios((cursos || []).map(mapHorarioCursoToLocal));
      setHorariosDocentes((docentes || []).map(mapHorarioDocenteToLocal));
    } catch (e) {
      console.error('Error cargando datos del panel admin:', e);
    }
  };

  useEffect(() => {
    // Suscribirse a cambios de sesión y obtener sesión inicial
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      const session = data?.session || null;
      setIsAuthenticated(!!session);
      setUserEmail(session?.user?.email ?? null);
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
      setUserEmail(session?.user?.email ?? null);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (isOpen && isAuthenticated) {
      loadAll();
    }
  }, [isOpen, isAuthenticated]);

  const addCommand = async () => {
    if (!newCommand.trim() || !newDescription.trim()) {
      alert('Por favor completa todos los campos');
      return;
    }

    try {
      const storedContent = responseType === 'link'
        ? `${linkMode}|${newContent.trim()}`
        : newContent;

      if (editingCommandId) {
        // Modo edición
        const updatedCommand = await supabase
          .from('custom_commands')
          .update({
            command: newCommand,
            description: newDescription,
            icon: newIcon || '⚙️',
            response_type: responseType,
            content: storedContent,
          })
          .eq('id', editingCommandId)
          .select()
          .single();

        if (updatedCommand.error) throw updatedCommand.error;

        setCommands(
          commands.map(c => c.id === editingCommandId ? mapCommandToLocal(updatedCommand.data) : c)
        );
        setEditingCommandId(null);
        alert('Comando actualizado correctamente');
      } else {
        // Modo creación
        const inserted = await supaAddCustomCommand({
          id: '', // Supabase lo genera
          command: newCommand,
          description: newDescription,
          icon: newIcon || '⚙️',
          response_type: responseType,
          content: storedContent,
        } as unknown as SCustomCommand);

        if (!inserted) {
          alert('No se pudo guardar el comando');
          return;
        }

        setCommands([mapCommandToLocal(inserted), ...commands]);
      }

      setNewCommand('');
      setNewDescription('');
      setNewIcon('');
      setNewContent('');
      setResponseType('text');
      setLinkMode('redirect');
    } catch (e) {
      console.error('Error guardando comando:', e);
      alert('Ocurrió un error al guardar el comando');
    }
  };

  const editCommand = (cmd: CustomCommand) => {
    setEditingCommandId(cmd.id);
    setNewCommand(cmd.command);
    setNewDescription(cmd.description);
    setNewIcon(cmd.icon);
    setResponseType(cmd.responseType);
    
    if (cmd.responseType === 'link' && cmd.content.includes('|')) {
      const [linkType, url] = cmd.content.split('|');
      setLinkMode(linkType as 'download' | 'redirect');
      setNewContent(url);
    } else {
      setNewContent(cmd.content);
    }
    
    // Hacer scroll al formulario después de un pequeño delay para que se actualice el DOM
    setTimeout(() => {
      const formElement = document.querySelector('[data-form="command-form"]');
      if (formElement) {
        formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 0);
  };

  const cancelEdit = () => {
    setEditingCommandId(null);
    setNewCommand('');
    setNewDescription('');
    setNewIcon('');
    setNewContent('');
    setResponseType('text');
    setLinkMode('redirect');
  };

  const addHorario = async () => {
    if (!newGrado.trim() || !newAnoElectivo.trim() || !newPdfUrl.trim()) {
      alert('Por favor completa todos los campos');
      return;
    }

    try {
      if (editingHorarioId) {
        // Modo edición
        const updated = await supabase
          .from('horarios_curso')
          .update({
            grado: newGrado,
            ano_electivo: newAnoElectivo,
            pdf_url: newPdfUrl,
          })
          .eq('id', editingHorarioId)
          .select()
          .single();

        if (updated.error) throw updated.error;

        setHorarios(
          horarios.map(h => h.id === editingHorarioId ? mapHorarioCursoToLocal(updated.data) : h)
        );
        setEditingHorarioId(null);
        alert('Horario actualizado correctamente');
      } else {
        // Modo creación
        const inserted = await addHorarioCurso({
          id: '', // Supabase lo genera
          grado: newGrado,
          ano_electivo: newAnoElectivo,
          pdf_url: newPdfUrl,
        } as unknown as SHorarioCurso);

        if (!inserted) {
          alert('No se pudo guardar el horario');
          return;
        }

        setHorarios([mapHorarioCursoToLocal(inserted), ...horarios]);
      }

      setNewGrado('');
      setNewAnoElectivo('');
      setNewPdfUrl('');
    } catch (e) {
      console.error('Error guardando horario de curso:', e);
      alert('Ocurrió un error al guardar el horario');
    }
  };

  const editHorario = (horario: Horario) => {
    setEditingHorarioId(horario.id);
    setNewGrado(horario.grado);
    setNewAnoElectivo(horario.anoElectivo);
    setNewPdfUrl(horario.pdfUrl);
    
    setTimeout(() => {
      const formElement = document.querySelector('[data-form="horario-form"]');
      if (formElement) {
        formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 0);
  };

  const cancelEditHorario = () => {
    setEditingHorarioId(null);
    setNewGrado('');
    setNewAnoElectivo('');
    setNewPdfUrl('');
  };

  const deleteCommand = async (id: string) => {
    try {
      const ok = await deleteCustomCommand(id);
      if (!ok) {
        alert('No se pudo eliminar el comando');
        return;
      }
      setCommands(commands.filter(cmd => cmd.id !== id));
    } catch (e) {
      console.error('Error eliminando comando:', e);
      alert('Ocurrió un error al eliminar el comando');
    }
  };

  const deleteHorario = async (id: string) => {
    try {
      const ok = await deleteHorarioCurso(id);
      if (!ok) {
        alert('No se pudo eliminar el horario');
        return;
      }
      setHorarios(horarios.filter(h => h.id !== id));
    } catch (e) {
      console.error('Error eliminando horario de curso:', e);
      alert('Ocurrió un error al eliminar el horario');
    }
  };

  const addHorarioDocente = async () => {
    if (!newNombreDocente.trim() || !newAnoElectivoDocente.trim() || !newPdfUrlDocente.trim()) {
      alert('Por favor completa todos los campos');
      return;
    }

    try {
      if (editingDocenteId) {
        // Modo edición
        const updated = await supabase
          .from('horarios_docente')
          .update({
            nombre_docente: newNombreDocente,
            ano_electivo: newAnoElectivoDocente,
            pdf_url: newPdfUrlDocente,
          })
          .eq('id', editingDocenteId)
          .select()
          .single();

        if (updated.error) throw updated.error;

        setHorariosDocentes(
          horariosDocentes.map(d => d.id === editingDocenteId ? mapHorarioDocenteToLocal(updated.data) : d)
        );
        setEditingDocenteId(null);
        alert('Horario del docente actualizado correctamente');
      } else {
        // Modo creación
        const inserted = await supaAddHorarioDocente({
          id: '', // Supabase lo genera
          nombre_docente: newNombreDocente,
          ano_electivo: newAnoElectivoDocente,
          pdf_url: newPdfUrlDocente,
        } as unknown as SHorarioDocente);

        if (!inserted) {
          alert('No se pudo guardar el horario del docente');
          return;
        }

        setHorariosDocentes([mapHorarioDocenteToLocal(inserted), ...horariosDocentes]);
      }

      setNewNombreDocente('');
      setNewAnoElectivoDocente('');
      setNewPdfUrlDocente('');
    } catch (e) {
      console.error('Error guardando horario de docente:', e);
      alert('Ocurrió un error al guardar el horario del docente');
    }
  };

  const editDocenteHorario = (docente: HorarioDocente) => {
    setEditingDocenteId(docente.id);
    setNewNombreDocente(docente.nombreDocente);
    setNewAnoElectivoDocente(docente.anoElectivo);
    setNewPdfUrlDocente(docente.pdfUrl);
    
    setTimeout(() => {
      const formElement = document.querySelector('[data-form="docente-form"]');
      if (formElement) {
        formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 0);
  };

  const cancelEditDocente = () => {
    setEditingDocenteId(null);
    setNewNombreDocente('');
    setNewAnoElectivoDocente('');
    setNewPdfUrlDocente('');
  };

  const deleteHorarioDocente = async (id: string) => {
    try {
      const ok = await supaDeleteHorarioDocente(id);
      if (!ok) {
        alert('No se pudo eliminar el horario del docente');
        return;
      }
      setHorariosDocentes(horariosDocentes.filter(h => h.id !== id));
    } catch (e) {
      console.error('Error eliminando horario de docente:', e);
      alert('Ocurrió un error al eliminar el horario del docente');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4">
      <div className={`${
        darkMode ? 'bg-gray-800' : 'bg-white'
      } rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col`}>
        
        {/* Header */}
        <div className={`${
          darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-100 border-gray-200'
        } border-b px-6 py-4 flex items-center justify-between`}>
          <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            🔧 Panel de Administración
          </h2>
          <div className="flex items-center gap-2">
            {isAuthenticated && (
              <div className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                {userEmail}
              </div>
            )}
            {isAuthenticated && (
              <button
                onClick={async () => { await supabase.auth.signOut(); }}
                className={`px-3 py-2 rounded-lg text-sm ${
                  darkMode ? 'bg-gray-600 hover:bg-gray-500 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                }`}
              >
                Cerrar sesión
              </button>
            )}
            <button
              onClick={onClose}
              className={`p-2 rounded-lg transition-colors ${
                darkMode ? 'hover:bg-gray-600 text-gray-400' : 'hover:bg-gray-200 text-gray-600'
              }`}
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className={`${
          darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
        } border-b flex`}>
          <button
            onClick={() => setActiveTab('commands')}
            className={`flex-1 px-6 py-3 font-semibold transition-colors ${
              activeTab === 'commands'
                ? 'border-b-2 border-blue-500 text-blue-500'
                : darkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            ⚡ Comandos Personalizados
          </button>
          <button
            onClick={() => setActiveTab('horarios')}
            className={`flex-1 px-6 py-3 font-semibold transition-colors ${
              activeTab === 'horarios'
                ? 'border-b-2 border-blue-500 text-blue-500'
                : darkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            � Horarios de Curso
          </button>
          <button
            onClick={() => setActiveTab('docentes')}
            className={`flex-1 px-6 py-3 font-semibold transition-colors ${
              activeTab === 'docentes'
                ? 'border-b-2 border-blue-500 text-blue-500'
                : darkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            👨‍🏫 Horario de Docente
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {!isAuthenticated ? (
            <div className={`${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'} max-w-md mx-auto mt-10 border rounded-xl p-6`}>
              <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Iniciar sesión (Administración)
              </h3>
              {authError && (
                <div className="mb-3 text-sm text-red-500">{authError}</div>
              )}
              <div className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Correo</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@colegio.edu"
                    className={`w-full px-3 py-2 rounded-lg border ${darkMode ? 'bg-gray-600 border-gray-500 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Contraseña</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className={`w-full px-3 py-2 rounded-lg border ${darkMode ? 'bg-gray-600 border-gray-500 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  />
                </div>
                <button
                  onClick={async () => {
                    setAuthError(null);
                    setAuthLoading(true);
                    try {
                      const { error } = await supabase.auth.signInWithPassword({ email, password });
                      if (error) {
                        setAuthError(error.message);
                      }
                    } catch (e: any) {
                      setAuthError('No se pudo iniciar sesión');
                    } finally {
                      setAuthLoading(false);
                    }
                  }}
                  disabled={authLoading || !email || !password}
                  className={`w-full px-4 py-2 rounded-lg font-semibold ${darkMode ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'} disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {authLoading ? 'Ingresando…' : 'Iniciar sesión'}
                </button>
              </div>
            </div>
          ) : (
          activeTab === 'commands' && (
            <div className="space-y-6">
              {/* Add Command Form */}
              <div data-form="command-form" className={`${
                darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
              } border rounded-lg p-6`}>
                <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {editingCommandId ? 'Editar Comando' : 'Agregar Nuevo Comando'}
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Comando (sin /)
                    </label>
                    <input
                      type="text"
                      value={newCommand}
                      onChange={(e) => setNewCommand(e.target.value)}
                      placeholder="ej: horario, avisos, contacto"
                      className={`w-full px-3 py-2 rounded-lg border ${
                        darkMode
                          ? 'bg-gray-600 border-gray-500 text-white placeholder-gray-400'
                          : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                      } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Icono
                    </label>
                    <input
                      type="text"
                      value={newIcon}
                      onChange={(e) => setNewIcon(e.target.value)}
                      placeholder="ej: 📅"
                      maxLength={2}
                      className={`w-full px-3 py-2 rounded-lg border ${
                        darkMode
                          ? 'bg-gray-600 border-gray-500 text-white placeholder-gray-400'
                          : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                      } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Descripción
                  </label>
                  <input
                    type="text"
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="Breve descripción del comando"
                    className={`w-full px-3 py-2 rounded-lg border ${
                      darkMode
                        ? 'bg-gray-600 border-gray-500 text-white placeholder-gray-400'
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  />
                </div>

                <div className="mb-4">
                  <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Tipo de Respuesta
                  </label>
                  <select
                    value={responseType}
                    onChange={(e) => setResponseType(e.target.value as any)}
                    className={`w-full px-3 py-2 rounded-lg border ${
                      darkMode
                        ? 'bg-gray-600 border-gray-500 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  >
                    <option value="text">Texto</option>
                    <option value="link">Link</option>
                  </select>
                </div>

                <div className="mb-4">
                  <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Contenido / Respuesta
                  </label>
                  <textarea
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    placeholder={responseType === 'link' ? 'URL del enlace (https://...)' : 'Contenido de la respuesta'}
                    rows={4}
                    className={`w-full px-3 py-2 rounded-lg border ${
                      darkMode
                        ? 'bg-gray-600 border-gray-500 text-white placeholder-gray-400'
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  />

                  {responseType === 'link' && (
                    <div className="mt-3">
                      <label className={`${darkMode ? 'text-gray-300' : 'text-gray-700'} block text-sm font-medium mb-2`}>
                        Modo del enlace
                      </label>
                      <div className="flex items-center gap-4 text-sm">
                        <label className="inline-flex items-center gap-2">
                          <input
                            type="radio"
                            name="linkMode"
                            value="redirect"
                            checked={linkMode === 'redirect'}
                            onChange={() => setLinkMode('redirect')}
                          />
                          <span>Redirigir</span>
                        </label>
                        <label className="inline-flex items-center gap-2">
                          <input
                            type="radio"
                            name="linkMode"
                            value="download"
                            checked={linkMode === 'download'}
                            onChange={() => setLinkMode('download')}
                          />
                          <span>Descarga</span>
                        </label>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={addCommand}
                    className="flex items-center space-x-2 flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-semibold"
                  >
                    <Plus className="h-5 w-5" />
                    <span>{editingCommandId ? 'Actualizar Comando' : 'Agregar Comando'}</span>
                  </button>
                  {editingCommandId && (
                    <button
                      onClick={cancelEdit}
                      className="flex items-center space-x-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-semibold"
                    >
                      <X className="h-5 w-5" />
                      <span>Cancelar</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Commands List */}
              <div>
                <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Comandos Existentes ({commands.length})
                </h3>
                <div className="space-y-3">
                  {commands.length === 0 ? (
                    <p className={`text-center py-8 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      No hay comandos personalizados aún
                    </p>
                  ) : (
                    commands.map((cmd) => (
                      <div
                        key={cmd.id}
                        className={`${
                          darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
                        } border rounded-lg p-4 flex items-start justify-between`}
                      >
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="text-2xl">{cmd.icon}</span>
                            <p className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                              /{cmd.command}
                            </p>
                            <span className={`text-xs px-2 py-1 rounded ${
                              darkMode ? 'bg-gray-600 text-gray-300' : 'bg-gray-200 text-gray-700'
                            }`}>
                              {cmd.responseType}
                            </span>
                            {cmd.responseType === 'link' && (() => {
                              const mode = (cmd.content || '').split('|', 2)[0];
                              const label = mode === 'download' ? 'Descarga' : mode === 'redirect' ? 'Redirigir' : null;
                              return label ? (
                                <span className={`text-xs px-2 py-1 rounded ${darkMode ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-700'}`}>
                                  {label}
                                </span>
                              ) : null;
                            })()}
                          </div>
                          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            {cmd.description}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2 ml-4">
                          <button
                            onClick={() => editCommand(cmd)}
                            className={`p-2 rounded-lg transition-colors ${
                              darkMode ? 'hover:bg-gray-600 text-gray-400' : 'hover:bg-gray-200 text-gray-600'
                            }`}
                            aria-label="Editar comando"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => deleteCommand(cmd.id)}
                            className={`p-2 rounded-lg transition-colors ${
                              darkMode ? 'hover:bg-red-900 text-red-400' : 'hover:bg-red-100 text-red-600'
                            }`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ))}

          {activeTab === 'horarios' && (
            <div className="space-y-6">
              {/* Add Horario Form */}
              <div data-form="horario-form" className={`${
                darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
              } border rounded-lg p-6`}>
                <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {editingHorarioId ? 'Editar Horario de Curso' : 'Agregar Nuevo Horario de Curso'}
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Grado (ej: 8-D)
                    </label>
                    <input
                      type="text"
                      value={newGrado}
                      onChange={(e) => setNewGrado(e.target.value)}
                      placeholder="8-D"
                      className={`w-full px-3 py-2 rounded-lg border ${
                        darkMode
                          ? 'bg-gray-600 border-gray-500 text-white placeholder-gray-400'
                          : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                      } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Año Electivo
                    </label>
                    <input
                      type="text"
                      value={newAnoElectivo}
                      onChange={(e) => setNewAnoElectivo(e.target.value)}
                      placeholder="2025-2026"
                      className={`w-full px-3 py-2 rounded-lg border ${
                        darkMode
                          ? 'bg-gray-600 border-gray-500 text-white placeholder-gray-400'
                          : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                      } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    URL del PDF
                  </label>
                  <input
                    type="url"
                    value={newPdfUrl}
                    onChange={(e) => setNewPdfUrl(e.target.value)}
                    placeholder="https://ejemplo.com/horario-8d.pdf"
                    className={`w-full px-3 py-2 rounded-lg border ${
                      darkMode
                        ? 'bg-gray-600 border-gray-500 text-white placeholder-gray-400'
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={addHorario}
                    className="flex items-center space-x-2 flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-semibold"
                  >
                    <Plus className="h-5 w-5" />
                    <span>{editingHorarioId ? 'Actualizar Horario' : 'Agregar Horario'}</span>
                  </button>
                  {editingHorarioId && (
                    <button
                      onClick={cancelEditHorario}
                      className="flex items-center space-x-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-semibold"
                    >
                      <X className="h-5 w-5" />
                      <span>Cancelar</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Horarios List */}
              <div>
                <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Horarios de Curso Existentes ({horarios.length})
                </h3>
                <div className="space-y-3">
                  {horarios.length === 0 ? (
                    <p className={`text-center py-8 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      No hay horarios agregados aún
                    </p>
                  ) : (
                    horarios.map((horario) => (
                      <div
                        key={horario.id}
                        className={`${
                          darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
                        } border rounded-lg p-4 flex items-start justify-between`}
                      >
                        <div className="flex-1">
                          <p className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                            📅 {horario.grado}
                          </p>
                          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            {horario.anoElectivo}
                          </p>
                          <a
                            href={horario.pdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:underline text-sm mt-1"
                          >
                            Ver PDF →
                          </a>
                        </div>
                        <div className="flex items-center space-x-2 ml-4">
                          <button
                            onClick={() => editHorario(horario)}
                            className={`p-2 rounded-lg transition-colors ${
                              darkMode ? 'hover:bg-gray-600 text-gray-400' : 'hover:bg-gray-200 text-gray-600'
                            }`}
                            aria-label="Editar horario"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => deleteHorario(horario.id)}
                            className={`p-2 rounded-lg transition-colors ${
                              darkMode ? 'hover:bg-red-900 text-red-400' : 'hover:bg-red-100 text-red-600'
                            }`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'docentes' && (
            <div className="space-y-6">
              {/* Add Horario Docente Form */}
              <div data-form="docente-form" className={`${
                darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
              } border rounded-lg p-6`}>
                <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {editingDocenteId ? 'Editar Horario de Docente' : 'Agregar Nuevo Horario de Docente'}
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Nombre del Docente
                    </label>
                    <input
                      type="text"
                      value={newNombreDocente}
                      onChange={(e) => setNewNombreDocente(e.target.value)}
                      placeholder="Ej: Prof. Juan García"
                      className={`w-full px-3 py-2 rounded-lg border ${
                        darkMode
                          ? 'bg-gray-600 border-gray-500 text-white placeholder-gray-400'
                          : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                      } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Año Electivo
                    </label>
                    <input
                      type="text"
                      value={newAnoElectivoDocente}
                      onChange={(e) => setNewAnoElectivoDocente(e.target.value)}
                      placeholder="2025-2026"
                      className={`w-full px-3 py-2 rounded-lg border ${
                        darkMode
                          ? 'bg-gray-600 border-gray-500 text-white placeholder-gray-400'
                          : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                      } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    URL del PDF
                  </label>
                  <input
                    type="url"
                    value={newPdfUrlDocente}
                    onChange={(e) => setNewPdfUrlDocente(e.target.value)}
                    placeholder="https://ejemplo.com/horario-juan-garcia.pdf"
                    className={`w-full px-3 py-2 rounded-lg border ${
                      darkMode
                        ? 'bg-gray-600 border-gray-500 text-white placeholder-gray-400'
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={addHorarioDocente}
                    className="flex items-center space-x-2 flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-semibold"
                  >
                    <Plus className="h-5 w-5" />
                    <span>{editingDocenteId ? 'Actualizar Horario Docente' : 'Agregar Horario Docente'}</span>
                  </button>
                  {editingDocenteId && (
                    <button
                      onClick={cancelEditDocente}
                      className="flex items-center space-x-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-semibold"
                    >
                      <X className="h-5 w-5" />
                      <span>Cancelar</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Horarios Docentes List */}
              <div>
                <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Horarios de Docente Existentes ({horariosDocentes.length})
                </h3>
                <div className="space-y-3">
                  {horariosDocentes.length === 0 ? (
                    <p className={`text-center py-8 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      No hay horarios de docente agregados aún
                    </p>
                  ) : (
                    horariosDocentes.map((horario) => (
                      <div
                        key={horario.id}
                        className={`${
                          darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
                        } border rounded-lg p-4 flex items-start justify-between`}
                      >
                        <div className="flex-1">
                          <p className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                            👨‍🏫 {horario.nombreDocente}
                          </p>
                          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            {horario.anoElectivo}
                          </p>
                          <a
                            href={horario.pdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:underline text-sm mt-1"
                          >
                            Ver PDF →
                          </a>
                        </div>
                        <div className="flex items-center space-x-2 ml-4">
                          <button
                            onClick={() => editDocenteHorario(horario)}
                            className={`p-2 rounded-lg transition-colors ${
                              darkMode ? 'hover:bg-gray-600 text-gray-400' : 'hover:bg-gray-200 text-gray-600'
                            }`}
                            aria-label="Editar horario de docente"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => deleteHorarioDocente(horario.id)}
                            className={`p-2 rounded-lg transition-colors ${
                              darkMode ? 'hover:bg-red-900 text-red-400' : 'hover:bg-red-100 text-red-600'
                            }`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
