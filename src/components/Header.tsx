import React from 'react';
import {View, Text} from 'react-native';
import {headerStyles as styles} from '../styles';
import {useLocalization} from '../localization';

interface HeaderProps {
  isOnline: boolean;
  gpsTracking: boolean;
}

export function Header({isOnline, gpsTracking}: HeaderProps) {
  const {t} = useLocalization();

  return (
    <View style={styles.header}>
      <Text style={styles.title}>{t('appName')}</Text>
      <View style={styles.statusContainer}>
        <View style={[styles.statusDot, isOnline && styles.online]} />
        <Text style={styles.statusText}>{isOnline ? 'Online' : 'Offline'}</Text>
        <View style={[styles.statusDot, gpsTracking && styles.gpsActive]} />
        <Text style={styles.statusText}>GPS: {gpsTracking ? 'On' : 'Off'}</Text>
      </View>
    </View>
  );
}
