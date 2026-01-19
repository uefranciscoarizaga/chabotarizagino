import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Tipos para los eventos
export interface Event {
  id: string
  title: string
  date: string
  time: string
  description: string
  category: string
  location: string
  image?: string
  created_at?: string
  created_by?: string
  updated_at?: string
}

// Función para obtener eventos del mes actual
export async function getEventsForCurrentMonth(): Promise<Event[]> {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const startDate = `${year}-${month.toString().padStart(2, '0')}-01`
  const endDate = `${year}-${month.toString().padStart(2, '0')}-31`

  const { data, error } = await supabase
    .from('events')
    .select('*')
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true })

  if (error) {
    console.error('Error fetching events:', error)
    return []
  }

  return data || []
}

// Función para obtener eventos por categoría
export async function getEventsByCategory(category: string): Promise<Event[]> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('category', category)
    .order('date', { ascending: true })

  if (error) {
    console.error('Error fetching events by category:', error)
    return []
  }

  return data || []
}

// Función para obtener eventos próximos (próximos 7 días)
export async function getUpcomingEvents(): Promise<Event[]> {
  const now = new Date()
  const nextWeek = new Date()
  nextWeek.setDate(now.getDate() + 7)

  const startDate = now.toISOString().split('T')[0]
  const endDate = nextWeek.toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('events')
    .select('*')
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true })

  if (error) {
    console.error('Error fetching upcoming events:', error)
    return []
  }

  return data || []
}

// Función para buscar eventos por título
export async function searchEventsByTitle(searchTerm: string): Promise<Event[]> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .ilike('title', `%${searchTerm}%`)
    .order('date', { ascending: true })

  if (error) {
    console.error('Error searching events:', error)
    return []
  }

  return data || []
}

// Función para obtener todos los eventos
export async function getAllEvents(): Promise<Event[]> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .order('date', { ascending: true })

  if (error) {
    console.error('Error fetching all events:', error)
    return []
  }

  return data || []
}

// ==================== COMANDOS PERSONALIZADOS ====================

export interface CustomCommand {
  id: string
  command: string
  description: string
  icon: string
  response_type: 'text' | 'link' | 'horario'
  content: string
  created_at?: string
  updated_at?: string
}

export async function getAllCustomCommands(): Promise<CustomCommand[]> {
  const { data, error } = await supabase
    .from('custom_commands')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching custom commands:', error)
    return []
  }

  return data || []
}

export async function addCustomCommand(command: CustomCommand): Promise<CustomCommand | null> {
  const { data, error } = await supabase
    .from('custom_commands')
    .insert([
      {
        command: command.command,
        description: command.description,
        icon: command.icon,
        response_type: command.response_type,
        content: command.content
      }
    ])
    .select()

  if (error) {
    console.error('Error adding custom command:', error)
    return null
  }

  return data?.[0] || null
}

export async function deleteCustomCommand(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('custom_commands')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting custom command:', error)
    return false
  }

  return true
}

// ==================== HORARIOS DE CURSO ====================

export interface HorarioCurso {
  id: string
  grado: string
  ano_electivo: string
  pdf_url: string
  created_at?: string
  updated_at?: string
}

export async function getAllHorariosCurso(): Promise<HorarioCurso[]> {
  const { data, error } = await supabase
    .from('horarios_curso')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching horarios curso:', error)
    return []
  }

  return data || []
}

export async function getHorarioCursoByGrado(grado: string): Promise<HorarioCurso | null> {
  const { data, error } = await supabase
    .from('horarios_curso')
    .select('*')
    .ilike('grado', `%${grado}%`)
    .single()

  if (error) {
    console.error('Error fetching horario curso by grado:', error)
    return null
  }

  return data || null
}

export async function addHorarioCurso(horario: HorarioCurso): Promise<HorarioCurso | null> {
  const { data, error } = await supabase
    .from('horarios_curso')
    .insert([
      {
        grado: horario.grado,
        ano_electivo: horario.ano_electivo,
        pdf_url: horario.pdf_url
      }
    ])
    .select()

  if (error) {
    console.error('Error adding horario curso:', error)
    return null
  }

  return data?.[0] || null
}

export async function deleteHorarioCurso(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('horarios_curso')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting horario curso:', error)
    return false
  }

  return true
}

// ==================== HORARIOS DE DOCENTE ====================

export interface HorarioDocente {
  id: string
  nombre_docente: string
  ano_electivo: string
  pdf_url: string
  created_at?: string
  updated_at?: string
}

export async function getAllHorariosDocente(): Promise<HorarioDocente[]> {
  const { data, error } = await supabase
    .from('horarios_docente')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching horarios docente:', error)
    return []
  }

  return data || []
}

export async function getHorarioDocenteByNombre(nombre: string): Promise<HorarioDocente | null> {
  const { data, error } = await supabase
    .from('horarios_docente')
    .select('*')
    .ilike('nombre_docente', `%${nombre}%`)
    .single()

  if (error) {
    console.error('Error fetching horario docente by nombre:', error)
    return null
  }

  return data || null
}

export async function addHorarioDocente(horario: HorarioDocente): Promise<HorarioDocente | null> {
  const { data, error } = await supabase
    .from('horarios_docente')
    .insert([
      {
        nombre_docente: horario.nombre_docente,
        ano_electivo: horario.ano_electivo,
        pdf_url: horario.pdf_url
      }
    ])
    .select()

  if (error) {
    console.error('Error adding horario docente:', error)
    return null
  }

  return data?.[0] || null
}

export async function deleteHorarioDocente(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('horarios_docente')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting horario docente:', error)
    return false
  }

  return true
}