import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { Invoice } from "@/types/invoice"

export interface InvoiceTemplate {
  id: string
  name: string
  description?: string
  vendor: string
  service?: string
  department?: string
  region?: string
  createdAt: number
  // Store a subset of invoice fields to reuse
  templateData: Partial<Invoice>
}

interface InvoiceTemplatesState {
  templates: InvoiceTemplate[]
  addTemplate: (template: Omit<InvoiceTemplate, "id" | "createdAt">) => void
  removeTemplate: (id: string) => void
  updateTemplate: (id: string, updates: Partial<InvoiceTemplate>) => void
  getTemplate: (id: string) => InvoiceTemplate | undefined
  getTemplatesByVendor: (vendor: string) => InvoiceTemplate[]
  getAllTemplates: () => InvoiceTemplate[]
}

/**
 * Invoice templates store — persisted to localStorage.
 * Allows users to save and reuse common invoice patterns
 * (vendor, service, region, etc.) to speed up data entry.
 */
export const useInvoiceTemplatesStore = create<InvoiceTemplatesState>()(
  persist(
    (set, get) => ({
      templates: [],

      addTemplate: (template) =>
        set((state) => ({
          templates: [
            ...state.templates,
            {
              ...template,
              id: `tpl-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              createdAt: Date.now(),
            },
          ],
        })),

      removeTemplate: (id) =>
        set((state) => ({
          templates: state.templates.filter((t) => t.id !== id),
        })),

      updateTemplate: (id, updates) =>
        set((state) => ({
          templates: state.templates.map((t) => (t.id === id ? { ...t, ...updates } : t)),
        })),

      getTemplate: (id) => get().templates.find((t) => t.id === id),

      getTemplatesByVendor: (vendor) => get().templates.filter((t) => t.vendor === vendor),

      getAllTemplates: () => get().templates,
    }),
    {
      name: "invoice-templates-storage",
      version: 1,
    }
  )
)
