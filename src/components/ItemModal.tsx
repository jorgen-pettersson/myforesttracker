import React, {useState} from 'react';
import {View, Text, TextInput, TouchableOpacity, Modal, ScrollView} from 'react-native';
import {InventoryItem, HistoryEntry, MediaItem} from '../types';
import {itemModalStyles as styles, mediaStyles} from '../styles';
import {useMedia} from '../hooks';
import {MediaGallery} from './MediaGallery';
import {formatArea} from '../utils';

const MAX_MEDIA_ITEMS = 5;

type ModalMode = 'view' | 'edit' | 'create';

interface ItemModalProps {
  visible: boolean;
  item: Partial<InventoryItem>;
  mode?: ModalMode;
  onChangeItem: (item: Partial<InventoryItem>) => void;
  onSave: () => void;
  onCancel: () => void;
  onEdit?: () => void;
}

export function ItemModal({
  visible,
  item,
  mode = 'create',
  onChangeItem,
  onSave,
  onCancel,
  onEdit,
}: ItemModalProps) {
  const [newHistoryTitle, setNewHistoryTitle] = useState('');
  const [newHistoryDescription, setNewHistoryDescription] = useState('');
  const [newHistoryMedia, setNewHistoryMedia] = useState<MediaItem[]>([]);
  const [showAddHistory, setShowAddHistory] = useState(false);

  const {showMediaPicker, deleteMedia} = useMedia();

  const isViewMode = mode === 'view';
  const isEditMode = mode === 'edit';

  const addHistoryEntry = () => {
    if (!newHistoryTitle.trim()) {
      return;
    }

    const newEntry: HistoryEntry = {
      timestamp: new Date().toISOString(),
      title: newHistoryTitle.trim(),
      description: newHistoryDescription.trim(),
      media: newHistoryMedia,
    };

    const updatedHistory = [...(item.history || []), newEntry];
    onChangeItem({...item, history: updatedHistory});

    setNewHistoryTitle('');
    setNewHistoryDescription('');
    setNewHistoryMedia([]);
    setShowAddHistory(false);
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
  };

  const handleCancel = () => {
    setNewHistoryTitle('');
    setNewHistoryDescription('');
    setNewHistoryMedia([]);
    setShowAddHistory(false);
    onCancel();
  };

  // Item media handlers
  const handleAddItemMedia = () => {
    showMediaPicker(media => {
      if (media) {
        const currentMedia = item.media || [];
        onChangeItem({...item, media: [...currentMedia, media]});
      }
    });
  };

  const handleRemoveItemMedia = async (mediaItem: MediaItem) => {
    await deleteMedia(mediaItem);
    const updatedMedia = (item.media || []).filter(m => m.id !== mediaItem.id);
    onChangeItem({...item, media: updatedMedia});
  };

  // History entry media handlers
  const handleAddHistoryMedia = () => {
    showMediaPicker(media => {
      if (media) {
        setNewHistoryMedia(prev => [...prev, media]);
      }
    });
  };

  const handleRemoveHistoryMedia = async (mediaItem: MediaItem) => {
    await deleteMedia(mediaItem);
    setNewHistoryMedia(prev => prev.filter(m => m.id !== mediaItem.id));
  };

  const itemMediaCount = item.media?.length || 0;
  const historyMediaCount = newHistoryMedia.length;

  const getTitle = () => {
    if (isViewMode) return item.name || 'Item Details';
    if (isEditMode) return 'Edit Item';
    return 'Add Item Details';
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            <Text style={styles.modalTitle}>{getTitle()}</Text>

            {/* Name */}
            {isViewMode ? (
              <View style={styles.viewField}>
                <Text style={styles.viewLabel}>Name</Text>
                <Text style={styles.viewValue}>{item.name || '-'}</Text>
              </View>
            ) : (
              <>
                <Text style={styles.label}>Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter name"
                  value={item.name}
                  onChangeText={text => onChangeItem({...item, name: text})}
                />
              </>
            )}

            {/* Notes */}
            {isViewMode ? (
              <View style={styles.viewField}>
                <Text style={styles.viewLabel}>Notes</Text>
                <Text style={styles.viewValue}>{item.notes || '-'}</Text>
              </View>
            ) : (
              <>
                <Text style={styles.label}>Notes</Text>
                <TextInput
                  style={[styles.input, styles.notesInput]}
                  placeholder="Enter notes"
                  value={item.notes}
                  onChangeText={text => onChangeItem({...item, notes: text})}
                  multiline
                  numberOfLines={2}
                />
              </>
            )}

            {/* Area info */}
            {item.type === 'area' && item.area && (
              <View style={styles.viewField}>
                <Text style={styles.viewLabel}>Area</Text>
                <Text style={styles.viewValue}>{formatArea(item.area)}</Text>
              </View>
            )}

            {/* Created date - only in view mode */}
            {isViewMode && item.created && (
              <View style={styles.viewField}>
                <Text style={styles.viewLabel}>Created</Text>
                <Text style={styles.viewValue}>{formatDate(item.created)}</Text>
              </View>
            )}

            {/* Item Media Section */}
            {isViewMode ? (
              itemMediaCount > 0 && (
                <View style={styles.mediaSection}>
                  <Text style={styles.viewLabel}>Media</Text>
                  <MediaGallery media={item.media || []} />
                </View>
              )
            ) : (
              <View style={styles.mediaSection}>
                <Text style={styles.label}>Media ({itemMediaCount}/{MAX_MEDIA_ITEMS})</Text>
                <View style={mediaStyles.mediaRow}>
                  {itemMediaCount < MAX_MEDIA_ITEMS && (
                    <TouchableOpacity
                      style={mediaStyles.addMediaButton}
                      onPress={handleAddItemMedia}>
                      <Text style={mediaStyles.addMediaButtonText}>+</Text>
                    </TouchableOpacity>
                  )}
                  <MediaGallery
                    media={item.media || []}
                    onRemove={handleRemoveItemMedia}
                    editable
                  />
                </View>
              </View>
            )}

            {/* History Section - shown in view and edit modes */}
            {(isViewMode || isEditMode) && (
              <View style={styles.historySection}>
                <View style={styles.historySectionHeader}>
                  <Text style={styles.historySectionTitle}>History</Text>
                  {!isViewMode && !showAddHistory && (
                    <TouchableOpacity
                      style={styles.addHistoryButton}
                      onPress={() => setShowAddHistory(true)}>
                      <Text style={styles.addHistoryButtonText}>+ Add</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {!isViewMode && showAddHistory && (
                  <View style={styles.addHistoryForm}>
                    <TextInput
                      style={styles.input}
                      placeholder="Title"
                      value={newHistoryTitle}
                      onChangeText={setNewHistoryTitle}
                    />
                    <TextInput
                      style={[styles.input, styles.historyDescInput]}
                      placeholder="Description"
                      value={newHistoryDescription}
                      onChangeText={setNewHistoryDescription}
                      multiline
                      numberOfLines={2}
                    />

                    {/* History Entry Media */}
                    <View style={styles.historyMediaSection}>
                      <Text style={styles.historyMediaLabel}>
                        Media ({historyMediaCount}/{MAX_MEDIA_ITEMS})
                      </Text>
                      <View style={mediaStyles.mediaRow}>
                        {historyMediaCount < MAX_MEDIA_ITEMS && (
                          <TouchableOpacity
                            style={[mediaStyles.addMediaButton, {width: 50, height: 50}]}
                            onPress={handleAddHistoryMedia}>
                            <Text style={mediaStyles.addMediaButtonText}>+</Text>
                          </TouchableOpacity>
                        )}
                        <MediaGallery
                          media={newHistoryMedia}
                          onRemove={handleRemoveHistoryMedia}
                          editable
                        />
                      </View>
                    </View>

                    <View style={styles.addHistoryButtons}>
                      <TouchableOpacity
                        style={styles.addHistoryCancelBtn}
                        onPress={() => {
                          setShowAddHistory(false);
                          setNewHistoryTitle('');
                          setNewHistoryDescription('');
                          setNewHistoryMedia([]);
                        }}>
                        <Text style={styles.addHistoryCancelText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.addHistoryConfirmBtn}
                        onPress={addHistoryEntry}>
                        <Text style={styles.addHistoryConfirmText}>Add</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {item.history && item.history.length > 0 ? (
                  <View style={styles.historyList}>
                    {[...item.history].reverse().map((entry, index) => (
                      <View key={index} style={styles.historyEntry}>
                        <Text style={styles.historyTimestamp}>{formatDate(entry.timestamp)}</Text>
                        <Text style={styles.historyEntryTitle}>{entry.title}</Text>
                        {entry.description ? (
                          <Text style={styles.historyDescription}>{entry.description}</Text>
                        ) : null}
                        {entry.media && entry.media.length > 0 && (
                          <MediaGallery media={entry.media} />
                        )}
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.noHistoryText}>No history entries yet</Text>
                )}
              </View>
            )}
          </ScrollView>

          {/* Buttons */}
          <View style={styles.modalButtons}>
            {isViewMode ? (
              <>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={handleCancel}>
                  <Text style={styles.modalButtonText}>Close</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.editButton]}
                  onPress={onEdit}>
                  <Text style={styles.modalButtonText}>Edit</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={handleCancel}>
                  <Text style={styles.modalButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.saveButton]}
                  onPress={onSave}>
                  <Text style={styles.modalButtonText}>Save</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}
