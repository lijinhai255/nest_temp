"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ReactNode } from "react";

interface PlaceholderTabProps {
  icon: ReactNode;
  title: string;
  description: string;
  badgeText: string;
  badgeColor: "yellow" | "green" | "red" | "blue";
}

const PlaceholderTab: React.FC<PlaceholderTabProps> = ({
  icon,
  title,
  description,
  badgeText,
  badgeColor,
}) => {
  const getBgColor = () => {
    switch (badgeColor) {
      case "yellow": return "bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200";
      case "green": return "bg-gradient-to-r from-green-50 to-emerald-50 border-green-200";
      case "red": return "bg-gradient-to-r from-red-50 to-pink-50 border-red-200";
      case "blue": return "bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200";
      default: return "bg-gradient-to-r from-gray-50 to-slate-50 border-gray-200";
    }
  };

  const getTextColor = () => {
    switch (badgeColor) {
      case "yellow": return "text-yellow-800";
      case "green": return "text-green-800";
      case "red": return "text-red-800";
      case "blue": return "text-blue-800";
      default: return "text-gray-800";
    }
  };

  const getBadgeStyle = () => {
    switch (badgeColor) {
      case "yellow": return "text-yellow-600 border-yellow-300";
      case "green": return "text-green-600 border-green-300";
      case "red": return "text-red-600 border-red-300";
      case "blue": return "text-blue-600 border-blue-300";
      default: return "text-gray-600 border-gray-300";
    }
  };

  const getDescriptionColor = () => {
    switch (badgeColor) {
      case "yellow": return "text-yellow-700";
      case "green": return "text-green-700";
      case "red": return "text-red-700";
      case "blue": return "text-blue-700";
      default: return "text-gray-700";
    }
  };

  return (
    <Card className={getBgColor()}>
      <CardContent className="p-6 text-center">
        <div className="space-y-3">
          {icon}
          <h3 className={`text-lg font-semibold ${getTextColor()}`}>{title}</h3>
          <p className={`text-sm ${getDescriptionColor()}`}>
            {description}
          </p>
          <Badge variant="outline" className={getBadgeStyle()}>
            {badgeText}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
};

export default PlaceholderTab;