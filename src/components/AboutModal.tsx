import React from 'react';
import {View, Text, Modal, TouchableOpacity, Linking} from 'react-native';
import {aboutModalStyles as styles} from '../styles';
import {useLocalization} from '../localization';

interface AboutModalProps {
  visible: boolean;
  onClose: () => void;
}

const APP_VERSION = '0.0.1';

export function AboutModal({visible, onClose}: AboutModalProps) {
  const {t} = useLocalization();

  const handleLinkPress = (url: string) => {
    Linking.openURL(url);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>{t('aboutTitle')}</Text>
          <Text style={styles.version}>{t('version')} {APP_VERSION}</Text>

          <View style={styles.divider} />

          <Text style={styles.description}>
            {t('aboutDescription')}
          </Text>

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>{t('features')}</Text>
          <Text style={styles.feature}>- {t('featureGps')}</Text>
          <Text style={styles.feature}>- {t('featureMedia')}</Text>
          <Text style={styles.feature}>- {t('featureHistory')}</Text>
          <Text style={styles.feature}>- {t('featureExport')}</Text>
          <Text style={styles.feature}>- {t('featureImport')}</Text>

          <View style={styles.divider} />

          <TouchableOpacity
            onPress={() => handleLinkPress('https://github.com/jorgen-pettersson/ForestryInventory')}>
            <Text style={styles.link}>{t('githubRepo')}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>{t('close')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
