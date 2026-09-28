import { useState } from "react"
import { toast } from "sonner"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useInvoiceTemplatesStore } from "@/store/useInvoiceTemplatesStore"

export function SaveAsTemplateButton({
  vendor,
  service,
  department,
  region,
}: {
  vendor?: string
  service?: string
  department?: string
  region?: string
}) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [templateName, setTemplateName] = useState(vendor ? `${vendor} - ${service || "Standard"}` : "New Template")
  const [templateDesc, setTemplateDesc] = useState("")
  const { addTemplate } = useInvoiceTemplatesStore()

  function handleSave() {
    if (!templateName.trim()) {
      toast.error("Template name is required")
      return
    }

    addTemplate({
      name: templateName.trim(),
      description: templateDesc.trim() || undefined,
      vendor: vendor || "Generic",
      service: service || undefined,
      department: department || undefined,
      region: region || undefined,
      templateData: {
        vendor: vendor || "",
        service: service || "",
        department: department || "",
        region: region || "",
      },
    })

    toast.success(`Template "${templateName}" saved!`)
    setDialogOpen(false)
    setTemplateName(vendor ? `${vendor} - ${service || "Standard"}` : "New Template")
    setTemplateDesc("")
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setDialogOpen(true)}
        disabled={!vendor}
        title={vendor ? "Save current invoice as a template" : "Select a vendor first"}
      >
        Save as Template
      </Button>

      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Save Invoice as Template</AlertDialogTitle>
            <AlertDialogDescription>
              Save the current invoice details as a template for quick reuse.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="template-name">Template Name</Label>
              <Input
                id="template-name"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="e.g., ABC Corp - Monthly Service"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="template-desc">Description (optional)</Label>
              <Textarea
                id="template-desc"
                value={templateDesc}
                onChange={(e) => setTemplateDesc(e.target.value)}
                placeholder="Add notes about this template..."
                rows={2}
              />
            </div>
            <div className="text-xs text-muted-foreground">
              <p>
                <strong>Saved fields:</strong> Vendor, Service, Department, Region
              </p>
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSave}>Save Template</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
