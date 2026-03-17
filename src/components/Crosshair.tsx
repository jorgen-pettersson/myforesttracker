import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { crosshairStyles as styles } from "../styles";
import { useLocalization } from "../localization";
import { DrawingMode } from "../features/inventory";

interface CrosshairProps {
  drawingMode: DrawingMode;
  areaPointsCount: number;
  repositionType?: "point" | "area";
  onConfirm: () => void;
  onCompleteReposition?: () => void;
  onCompleteSplit?: () => void;
  onCancelReposition?: () => void;
}

export function Crosshair({
  drawingMode,
  areaPointsCount,
  repositionType,
  onConfirm,
  onCompleteReposition,
  onCompleteSplit,
  onCancelReposition,
}: CrosshairProps) {
  const { t } = useLocalization();
  if (drawingMode === "none") {
    return null;
  }

  const getButtonText = () => {
    if (drawingMode === "point") {
      return t("addPoint");
    }
    if (drawingMode === "area") {
      return `${t("addAreaPoint")} ${areaPointsCount + 1}`;
    }
    if (drawingMode === "reposition") {
      if (repositionType === "point") {
        return t("setNewPosition");
      }
      return `${t("addAreaPoint")} ${areaPointsCount + 1}`;
    }
    if (drawingMode === "split" || drawingMode === "splitAdjust") {
      return `${t("addSplitPoint")} ${areaPointsCount + 1}`;
    }
    return "";
  };

  return (
    <>
      <View style={styles.crosshairContainer} pointerEvents="none">
        <View style={styles.crosshairVertical} />
        <View style={styles.crosshairHorizontal} />
        <View style={styles.crosshairCenter} />
      </View>

      <TouchableOpacity style={styles.confirmButton} onPress={onConfirm}>
        <Text style={styles.confirmButtonText}>{getButtonText()}</Text>
      </TouchableOpacity>

      {drawingMode === "reposition" && (
        <View style={styles.repositionButtons}>
          {repositionType === "area" && areaPointsCount >= 3 && (
            <TouchableOpacity
              style={styles.completeButton}
              onPress={onCompleteReposition}
            >
              <Text style={styles.confirmButtonText}>
                {t("completeReposition")}
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.cancelRepositionButton}
            onPress={onCancelReposition}
          >
            <Text style={styles.confirmButtonText}>
              {t("cancelReposition")}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {(drawingMode === "split" || drawingMode === "splitAdjust") && (
        <View style={styles.repositionButtons}>
          {areaPointsCount >= 2 && onCompleteSplit && (
            <TouchableOpacity
              style={styles.completeButton}
              onPress={onCompleteSplit}
            >
              <Text style={styles.confirmButtonText}>{t("completeSplit")}</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.cancelRepositionButton}
            onPress={onCancelReposition}
          >
            <Text style={styles.confirmButtonText}>
              {t("cancelReposition")}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </>
  );
}
