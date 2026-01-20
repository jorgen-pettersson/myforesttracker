import React, {useState} from 'react';
import {View, Text, TouchableOpacity, Modal, ScrollView, StyleSheet} from 'react-native';
import {useLocalization} from '../localization';

interface PropertyMappingModalProps {
  visible: boolean;
  properties: string[];
  suggestedNameProperty?: string;
  onConfirm: (nameProperty: string, notesProperty: string) => void;
  onCancel: () => void;
}

export function PropertyMappingModal({
  visible,
  properties,
  suggestedNameProperty,
  onConfirm,
  onCancel,
}: PropertyMappingModalProps) {
  const {t} = useLocalization();
  const [nameProperty, setNameProperty] = useState<string>('');
  const [notesProperty, setNotesProperty] = useState<string>('');

  // Common name-like property names to auto-select
  const nameDefaults = ['name', 'Name', 'NAME', 'title', 'Title', 'label', 'Label'];
  const notesDefaults = ['notes', 'Notes', 'description', 'Description', 'desc', 'comment', 'Comment'];

  // Auto-select defaults on first render
  React.useEffect(() => {
    if (properties.length > 0) {
      // Prefer the suggested name property (e.g., forestand.placeId), fall back to common defaults
      const defaultName = suggestedNameProperty ||
        properties.find(p => nameDefaults.includes(p)) || '';
      const defaultNotes = properties.find(p => notesDefaults.includes(p)) || '';
      setNameProperty(defaultName);
      setNotesProperty(defaultNotes);
    }
  }, [properties, suggestedNameProperty]);

  const handleConfirm = () => {
    onConfirm(nameProperty, notesProperty);
  };

  const renderPropertyButton = (
    prop: string,
    selected: boolean,
    onPress: () => void,
  ) => (
    <TouchableOpacity
      key={prop}
      style={[styles.propertyButton, selected && styles.propertyButtonSelected]}
      onPress={onPress}>
      <Text style={[styles.propertyButtonText, selected && styles.propertyButtonTextSelected]}>
        {prop}
      </Text>
    </TouchableOpacity>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>{t('mapProperties') || 'Map Properties'}</Text>

          <Text style={styles.sectionTitle}>{t('name') || 'Name'}</Text>
          <Text style={styles.sectionHint}>{t('selectNameProperty') || 'Select property for item name'}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.propertyScroll}>
            <View style={styles.propertyRow}>
              <TouchableOpacity
                style={[styles.propertyButton, nameProperty === '' && styles.propertyButtonSelected]}
                onPress={() => setNameProperty('')}>
                <Text style={[styles.propertyButtonText, nameProperty === '' && styles.propertyButtonTextSelected]}>
                  (none)
                </Text>
              </TouchableOpacity>
              {properties.map(prop =>
                renderPropertyButton(
                  prop,
                  nameProperty === prop,
                  () => setNameProperty(prop),
                ),
              )}
            </View>
          </ScrollView>

          <Text style={styles.sectionTitle}>{t('notes') || 'Notes'}</Text>
          <Text style={styles.sectionHint}>{t('selectNotesProperty') || 'Select property for item notes'}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.propertyScroll}>
            <View style={styles.propertyRow}>
              <TouchableOpacity
                style={[styles.propertyButton, notesProperty === '' && styles.propertyButtonSelected]}
                onPress={() => setNotesProperty('')}>
                <Text style={[styles.propertyButtonText, notesProperty === '' && styles.propertyButtonTextSelected]}>
                  (none)
                </Text>
              </TouchableOpacity>
              {properties.map(prop =>
                renderPropertyButton(
                  prop,
                  notesProperty === prop,
                  () => setNotesProperty(prop),
                ),
              )}
            </View>
          </ScrollView>

          <View style={styles.modalButtons}>
            <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={onCancel}>
              <Text style={styles.modalButtonText}>{t('cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modalButton, styles.confirmButton]} onPress={handleConfirm}>
              <Text style={styles.modalButtonText}>{t('import') || 'Import'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 10,
    width: '90%',
    maxHeight: '70%',
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginTop: 10,
  },
  sectionHint: {
    fontSize: 12,
    color: '#888',
    marginBottom: 8,
  },
  propertyScroll: {
    maxHeight: 50,
    marginBottom: 10,
  },
  propertyRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 5,
  },
  propertyButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  propertyButtonSelected: {
    backgroundColor: '#27ae60',
    borderColor: '#27ae60',
  },
  propertyButtonText: {
    fontSize: 13,
    color: '#333',
  },
  propertyButtonTextSelected: {
    color: 'white',
    fontWeight: '600',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 5,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#95a5a6',
  },
  confirmButton: {
    backgroundColor: '#27ae60',
  },
  modalButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});
