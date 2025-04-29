import { ConfirmDialog } from "~/components/common/ConfirmDialog";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Loader2 } from "lucide-react";
import { cn } from "~/lib/utils";
import { Textarea } from "~/components/ui/textarea";

interface SubsciptionOrdersListConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOK: () => void;
  onCancel: () => void;
  disabled?: boolean;
  loading?: boolean;
  type:
    | "delete"
    | "skip-delivery"
    | "pause"
    | "resume"
    | "approve"
    | "decline"
    | "cancel";
  rejectNote?: string;
  onRejectNoteChange?: (value: string) => void;
}

export const SubsciptionOrdersListConfirmDialog = ({
  open,
  onOpenChange,
  onOK,
  onCancel,
  disabled,
  loading,
  type,
  rejectNote,
  onRejectNoteChange,
}: SubsciptionOrdersListConfirmDialogProps) => {
  const { t } = useTranslation();
  const i18nPrefix = "subscription-orders.common-actions";
  const config = {
    delete: {
      title: t(`${i18nPrefix}.delete.dialog.title`),
      description: t(`${i18nPrefix}.delete.dialog.description`),
      okText: t(`${i18nPrefix}.delete.dialog.confirm`),
    },
    "skip-delivery": {
      title: t(`${i18nPrefix}.skip-delivery.dialog.title`),
      description: t(`${i18nPrefix}.skip-delivery.dialog.description`),
      okText: t(`${i18nPrefix}.skip-delivery.dialog.confirm`),
    },
    pause: {
      title: t(`${i18nPrefix}.pause.dialog.title`),
      description: t(`${i18nPrefix}.pause.dialog.description`),
      okText: t(`${i18nPrefix}.pause.dialog.confirm`),
    },
    resume: {
      title: t(`${i18nPrefix}.resume.dialog.title`),
      description: t(`${i18nPrefix}.resume.dialog.description`),
      okText: t(`${i18nPrefix}.resume.dialog.confirm`),
    },
    approve: {
      title: t(`${i18nPrefix}.approve.dialog.title`),
      description: t(`${i18nPrefix}.approve.dialog.description`),
      okText: t(`${i18nPrefix}.approve.dialog.confirm`),
    },
    decline: {
      title: t(`${i18nPrefix}.decline.dialog.title`),
      description: t(`${i18nPrefix}.decline.dialog.description`),
      okText: t(`${i18nPrefix}.decline.dialog.confirm`),
    },
    cancel: {
      title: t(`${i18nPrefix}.cancel.dialog.title`),
      description: t(`${i18nPrefix}.cancel.dialog.description`),
      okText: t(`${i18nPrefix}.cancel.dialog.confirm`),
    },
  };
  if (type === "approve" || type === "decline" || type === "cancel") {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md px-14">
          <DialogHeader>
            <DialogTitle className="text-center mb-4 font-bold pt-5">
              {config[type].title}
            </DialogTitle>
            <DialogDescription className={cn("pb-11 text-center")}>
              {config[type].description}
            </DialogDescription>
          </DialogHeader>

          {(type === "decline" || type === "cancel") && (
            <div className="pb-4">
              <Textarea
                placeholder={t(
                  `${i18nPrefix}.${type}.dialog.${type}-placeholder`,
                )}
                value={rejectNote}
                onChange={(e) =>
                  onRejectNoteChange?.(e.target.value.slice(0, 500))
                }
                className="min-h-[100px]"
              />
              <div className="mt-2 text-sm text-gray-300">
                {t(`${i18nPrefix}.${type}.dialog.${type}-character-count`, {
                  count: rejectNote?.length || 0,
                })}
              </div>
            </div>
          )}

          <DialogFooter className="!flex-col-reverse gap-4 !space-x-0 pb-2">
            <Button variant="outline" onClick={onCancel} className="h-11">
              {t("common.text.cancel")}
            </Button>
            <Button
              variant="default"
              onClick={onOK}
              disabled={
                disabled ||
                ((type === "decline" || type === "cancel") && !rejectNote)
              }
              className="h-11"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                config[type].okText
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={config[type].title}
      description={config[type].description}
      onCancel={onCancel}
      onOK={onOK}
      okText={config[type].okText}
      okDisabled={disabled}
      okLoading={loading}
    />
  );
};
