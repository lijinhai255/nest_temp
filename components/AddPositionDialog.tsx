"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import AddPosition from "./AddPosition";
import { PlusCircle } from "lucide-react";

interface AddPositionDialogProps {
  onPositionAdded?: () => void;
  triggerClassName?: string;
  triggerText?: string;
}

const AddPositionDialog: React.FC<AddPositionDialogProps> = ({
  onPositionAdded,
  triggerClassName,
  triggerText = "添加流动性",
}) => {
  const [open, setOpen] = useState(false);

  const handlePositionAdded = () => {
    setOpen(false);
    if (onPositionAdded) {
      onPositionAdded();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className={triggerClassName}>
          <PlusCircle className="mr-2 h-4 w-4" />
          {triggerText}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>添加流动性</DialogTitle>
          <DialogDescription>
            选择交易对并添加流动性以赚取手续费
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <AddPosition onPositionAdded={handlePositionAdded} />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddPositionDialog;