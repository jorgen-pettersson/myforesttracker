import { StyleSheet } from "react-native";

export const itemModalStyles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 10,
    width: "85%",
    maxHeight: "85%",
    padding: 20,
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingBottom: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 5,
    padding: 10,
    marginBottom: 15,
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  notesInput: {
    height: 50,
    textAlignVertical: "top",
  },
  areaText: {
    fontSize: 14,
    color: "#666",
    marginBottom: 10,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 5,
    alignItems: "center",
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: "#95a5a6",
  },
  saveButton: {
    backgroundColor: "#27ae60",
  },
  modalButtonText: {
    color: "white",
    fontWeight: "bold",
  },
  historySection: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    paddingTop: 15,
  },
  historySectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  historySectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  addHistoryButton: {
    backgroundColor: "#3498db",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  addHistoryButtonText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },
  addHistoryForm: {
    backgroundColor: "#f8f9fa",
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  historyDescInput: {
    height: 50,
    textAlignVertical: "top",
  },
  addHistoryButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },
  addHistoryCancelBtn: {
    paddingHorizontal: 15,
    paddingVertical: 8,
  },
  addHistoryCancelText: {
    color: "#666",
    fontSize: 14,
  },
  addHistoryConfirmBtn: {
    backgroundColor: "#27ae60",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 4,
  },
  addHistoryConfirmText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  historyList: {
    // No maxHeight - let parent ScrollView handle scrolling
  },
  historyEntry: {
    backgroundColor: "#f8f9fa",
    padding: 8,
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: "#3498db",
    marginBottom: 6,
  },
  historyTimestamp: {
    fontSize: 10,
    color: "#888",
    marginBottom: 2,
  },
  historyEntryTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#333",
  },
  historyDescription: {
    fontSize: 13,
    color: "#666",
    marginTop: 4,
  },
  noHistoryText: {
    fontSize: 13,
    color: "#999",
    fontStyle: "italic",
  },
  mediaSection: {
    marginBottom: 15,
  },
  historyMediaSection: {
    marginBottom: 10,
  },
  historyMediaLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
    marginBottom: 6,
  },
  viewField: {
    marginBottom: 15,
  },
  viewLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#888",
    marginBottom: 4,
  },
  viewValue: {
    fontSize: 16,
    color: "#333",
  },
  editButton: {
    backgroundColor: "#3498db",
  },
  propertiesSection: {
    marginBottom: 15,
    backgroundColor: "#f8f9fa",
    padding: 10,
    borderRadius: 8,
  },
  propertyRow: {
    flexDirection: "row",
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  propertyRowIndented: {
    marginLeft: 12,
  },
  propertySubheader: {
    fontSize: 13,
    fontWeight: "700",
    color: "#444",
    marginTop: 8,
    marginBottom: 4,
  },
  propertyKey: {
    fontSize: 13,
    fontWeight: "600",
    color: "#555",
    marginRight: 8,
    minWidth: 80,
  },
  propertyValue: {
    fontSize: 13,
    color: "#333",
    flex: 1,
  },
});
