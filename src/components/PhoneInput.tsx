import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Modal,
  FlatList, StyleSheet, SafeAreaView,
} from 'react-native';
import { colors } from '../theme/colors';

const COUNTRY_CODES = [
  { code: '+34', flag: '🇪🇸', name: 'España' },
  { code: '+212', flag: '🇲🇦', name: 'Marruecos' },
  { code: '+213', flag: '🇩🇿', name: 'Argelia' },
  { code: '+33', flag: '🇫🇷', name: 'Francia' },
  { code: '+44', flag: '🇬🇧', name: 'Reino Unido' },
  { code: '+49', flag: '🇩🇪', name: 'Alemania' },
  { code: '+39', flag: '🇮🇹', name: 'Italia' },
  { code: '+351', flag: '🇵🇹', name: 'Portugal' },
  { code: '+1', flag: '🇺🇸', name: 'EE.UU.' },
  { code: '+54', flag: '🇦🇷', name: 'Argentina' },
  { code: '+52', flag: '🇲🇽', name: 'México' },
  { code: '+55', flag: '🇧🇷', name: 'Brasil' },
];

export function parseTelefono(raw: string): { prefix: string; number: string } {
  if (!raw) return { prefix: '+34', number: '' };
  const match = raw.match(/^(\+\d{1,3})\s*(.*)$/);
  if (match) return { prefix: match[1], number: match[2] };
  return { prefix: '+34', number: raw };
}

interface Props {
  value: string;
  onChange: (fullNumber: string) => void;
  inputStyle?: object;
}

export default function PhoneInput({ value, onChange, inputStyle }: Props) {
  const parsed = parseTelefono(value);
  const [prefix, setPrefix] = useState(parsed.prefix);
  const [number, setNumber] = useState(parsed.number);
  const [modalVisible, setModalVisible] = useState(false);

  const selected = COUNTRY_CODES.find(c => c.code === prefix) || COUNTRY_CODES[0];

  const handleNumberChange = (num: string) => {
    setNumber(num);
    onChange(num ? `${prefix} ${num}` : '');
  };

  const handlePrefixSelect = (code: string) => {
    setPrefix(code);
    setModalVisible(false);
    onChange(number ? `${code} ${number}` : '');
  };

  return (
    <View style={styles.row}>
      <TouchableOpacity style={styles.prefixBtn} onPress={() => setModalVisible(true)}>
        <Text style={styles.flag}>{selected.flag}</Text>
        <Text style={styles.code}>{selected.code}</Text>
        <Text style={styles.chevron}>▾</Text>
      </TouchableOpacity>

      <TextInput
        style={[styles.input, inputStyle]}
        value={number}
        onChangeText={handleNumberChange}
        placeholder="600 000 000"
        keyboardType="phone-pad"
        returnKeyType="done"
      />

      <Modal visible={modalVisible} animationType="slide" transparent>
        <SafeAreaView style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Prefijo país</Text>
            <FlatList
              data={COUNTRY_CODES}
              keyExtractor={item => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.countryRow, item.code === prefix && styles.countryRowSelected]}
                  onPress={() => handlePrefixSelect(item.code)}
                >
                  <Text style={styles.countryFlag}>{item.flag}</Text>
                  <Text style={styles.countryName}>{item.name}</Text>
                  <Text style={styles.countryCode}>{item.code}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={styles.closeBtn} onPress={() => setModalVisible(false)}>
              <Text style={styles.closeBtnText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.background,
    marginTop: 4,
    alignItems: 'center',
  },
  prefixBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    gap: 4,
  },
  flag: { fontSize: 18 },
  code: { fontSize: 14, color: colors.text, fontWeight: '600' },
  chevron: { fontSize: 10, color: colors.textSecondary },
  input: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalBox: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 16,
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  countryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    gap: 12,
  },
  countryRowSelected: { backgroundColor: colors.background },
  countryFlag: { fontSize: 22, width: 32 },
  countryName: { flex: 1, fontSize: 15, color: colors.text },
  countryCode: { fontSize: 14, color: colors.textSecondary, fontWeight: '600' },
  closeBtn: {
    margin: 16,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  closeBtnText: { color: colors.text, fontWeight: '600' },
});
