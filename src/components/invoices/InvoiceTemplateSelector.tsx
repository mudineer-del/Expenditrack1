import { Plus, Trash2 } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { useInvoiceTemplatesStore } from "@/store/useInvoiceTemplatesStore"
import type { Invoice } from "@/types/invoice"

export function InvoiceTemplateSelector({
  currentVendor,
  onApplyTemplate,
  onSaveAsTemplate,
}: {
  currentVendor?: string
  onApplyTemplate: (data: Partial<Invoice>) => void
  onSaveAsTemplate: () => void
}) {
  const { templates, getTemplatesByVendor, removeTemplate } = useInvoiceTemplatesStore()

  const relevantTemplates = currentVendor ? getTemplatesByVendor(currentVendor) : templates

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Plus className="size-4" />
          Templates
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        {relevantTemplates.length > 0 ? (
          <>
            <DropdownMenuLabel>Quick Load</DropdownMenuLabel>
            {relevantTemplates.map((template) => (
              <div key={template.id} className="flex items-center justify-between px-2 py-1.5 text-sm hover:bg-muted rounded">
                <button
                  className="flex-1 text-left hover:underline"
                  onClick={() => {
                    onApplyTemplate(template.templateData)
                    toast.success(`Loaded template: ${template.name}`)
                  }}
                >
                  {template.name}
                  {template.description && (
                    <p className="text-xs text-muted-foreground">{template.description}</p>
                  )}
                </button>
                <button
                  className="p-1 text-destructive hover:bg-destructive/10 rounded"
                  onClick={() => {
                    removeTemplate(template.id)
                    toast.success("Template deleted")
                  }}
                  title="Delete template"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            ))}
            <DropdownMenuSeparator />
          </>
        ) : (
          <DropdownMenuLabel className="text-muted-foreground text-xs py-2">
            No templates yet
          </DropdownMenuLabel>
        )}

        <DropdownMenuItem onClick={onSaveAsTemplate}>
          <Plus className="size-4 mr-2" />
          Save Current as Template
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
