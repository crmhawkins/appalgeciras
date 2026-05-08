import React, { useState, useMemo, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Modal,
  FlatList, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';

const ALL_COUNTRIES = [
  { code: '+34', flag: '🇪🇸', name: 'España' },
  { code: '+1', flag: '🇺🇸', name: 'EE.UU. / Canadá' },
  { code: '+7', flag: '🇷🇺', name: 'Rusia / Kazajistán' },
  { code: '+20', flag: '🇪🇬', name: 'Egipto' },
  { code: '+27', flag: '🇿🇦', name: 'Sudáfrica' },
  { code: '+30', flag: '🇬🇷', name: 'Grecia' },
  { code: '+31', flag: '🇳🇱', name: 'Países Bajos' },
  { code: '+32', flag: '🇧🇪', name: 'Bélgica' },
  { code: '+33', flag: '🇫🇷', name: 'Francia' },
  { code: '+36', flag: '🇭🇺', name: 'Hungría' },
  { code: '+39', flag: '🇮🇹', name: 'Italia' },
  { code: '+40', flag: '🇷🇴', name: 'Rumanía' },
  { code: '+41', flag: '🇨🇭', name: 'Suiza' },
  { code: '+43', flag: '🇦🇹', name: 'Austria' },
  { code: '+44', flag: '🇬🇧', name: 'Reino Unido' },
  { code: '+45', flag: '🇩🇰', name: 'Dinamarca' },
  { code: '+46', flag: '🇸🇪', name: 'Suecia' },
  { code: '+47', flag: '🇳🇴', name: 'Noruega' },
  { code: '+48', flag: '🇵🇱', name: 'Polonia' },
  { code: '+49', flag: '🇩🇪', name: 'Alemania' },
  { code: '+51', flag: '🇵🇪', name: 'Perú' },
  { code: '+52', flag: '🇲🇽', name: 'México' },
  { code: '+53', flag: '🇨🇺', name: 'Cuba' },
  { code: '+54', flag: '🇦🇷', name: 'Argentina' },
  { code: '+55', flag: '🇧🇷', name: 'Brasil' },
  { code: '+56', flag: '🇨🇱', name: 'Chile' },
  { code: '+57', flag: '🇨🇴', name: 'Colombia' },
  { code: '+58', flag: '🇻🇪', name: 'Venezuela' },
  { code: '+60', flag: '🇲🇾', name: 'Malasia' },
  { code: '+61', flag: '🇦🇺', name: 'Australia' },
  { code: '+62', flag: '🇮🇩', name: 'Indonesia' },
  { code: '+63', flag: '🇵🇭', name: 'Filipinas' },
  { code: '+64', flag: '🇳🇿', name: 'Nueva Zelanda' },
  { code: '+65', flag: '🇸🇬', name: 'Singapur' },
  { code: '+66', flag: '🇹🇭', name: 'Tailandia' },
  { code: '+81', flag: '🇯🇵', name: 'Japón' },
  { code: '+82', flag: '🇰🇷', name: 'Corea del Sur' },
  { code: '+84', flag: '🇻🇳', name: 'Vietnam' },
  { code: '+86', flag: '🇨🇳', name: 'China' },
  { code: '+90', flag: '🇹🇷', name: 'Turquía' },
  { code: '+91', flag: '🇮🇳', name: 'India' },
  { code: '+92', flag: '🇵🇰', name: 'Pakistán' },
  { code: '+93', flag: '🇦🇫', name: 'Afganistán' },
  { code: '+94', flag: '🇱🇰', name: 'Sri Lanka' },
  { code: '+95', flag: '🇲🇲', name: 'Myanmar' },
  { code: '+98', flag: '🇮🇷', name: 'Irán' },
  { code: '+212', flag: '🇲🇦', name: 'Marruecos' },
  { code: '+213', flag: '🇩🇿', name: 'Argelia' },
  { code: '+216', flag: '🇹🇳', name: 'Túnez' },
  { code: '+218', flag: '🇱🇾', name: 'Libia' },
  { code: '+220', flag: '🇬🇲', name: 'Gambia' },
  { code: '+221', flag: '🇸🇳', name: 'Senegal' },
  { code: '+222', flag: '🇲🇷', name: 'Mauritania' },
  { code: '+223', flag: '🇲🇱', name: 'Mali' },
  { code: '+224', flag: '🇬🇳', name: 'Guinea' },
  { code: '+225', flag: '🇨🇮', name: 'Costa de Marfil' },
  { code: '+226', flag: '🇧🇫', name: 'Burkina Faso' },
  { code: '+227', flag: '🇳🇪', name: 'Níger' },
  { code: '+228', flag: '🇹🇬', name: 'Togo' },
  { code: '+229', flag: '🇧🇯', name: 'Benín' },
  { code: '+230', flag: '🇲🇺', name: 'Mauricio' },
  { code: '+231', flag: '🇱🇷', name: 'Liberia' },
  { code: '+232', flag: '🇸🇱', name: 'Sierra Leona' },
  { code: '+233', flag: '🇬🇭', name: 'Ghana' },
  { code: '+234', flag: '🇳🇬', name: 'Nigeria' },
  { code: '+235', flag: '🇹🇩', name: 'Chad' },
  { code: '+236', flag: '🇨🇫', name: 'Rep. Centroafricana' },
  { code: '+237', flag: '🇨🇲', name: 'Camerún' },
  { code: '+238', flag: '🇨🇻', name: 'Cabo Verde' },
  { code: '+239', flag: '🇸🇹', name: 'Santo Tomé y Príncipe' },
  { code: '+240', flag: '🇬🇶', name: 'Guinea Ecuatorial' },
  { code: '+241', flag: '🇬🇦', name: 'Gabón' },
  { code: '+242', flag: '🇨🇬', name: 'Congo' },
  { code: '+243', flag: '🇨🇩', name: 'R.D. Congo' },
  { code: '+244', flag: '🇦🇴', name: 'Angola' },
  { code: '+245', flag: '🇬🇼', name: 'Guinea-Bisáu' },
  { code: '+246', flag: '🇮🇴', name: 'Diego García' },
  { code: '+248', flag: '🇸🇨', name: 'Seychelles' },
  { code: '+249', flag: '🇸🇩', name: 'Sudán' },
  { code: '+250', flag: '🇷🇼', name: 'Ruanda' },
  { code: '+251', flag: '🇪🇹', name: 'Etiopía' },
  { code: '+252', flag: '🇸🇴', name: 'Somalia' },
  { code: '+253', flag: '🇩🇯', name: 'Yibuti' },
  { code: '+254', flag: '🇰🇪', name: 'Kenia' },
  { code: '+255', flag: '🇹🇿', name: 'Tanzania' },
  { code: '+256', flag: '🇺🇬', name: 'Uganda' },
  { code: '+257', flag: '🇧🇮', name: 'Burundi' },
  { code: '+258', flag: '🇲🇿', name: 'Mozambique' },
  { code: '+260', flag: '🇿🇲', name: 'Zambia' },
  { code: '+261', flag: '🇲🇬', name: 'Madagascar' },
  { code: '+262', flag: '🇷🇪', name: 'Reunión' },
  { code: '+263', flag: '🇿🇼', name: 'Zimbabue' },
  { code: '+264', flag: '🇳🇦', name: 'Namibia' },
  { code: '+265', flag: '🇲🇼', name: 'Malaui' },
  { code: '+266', flag: '🇱🇸', name: 'Lesoto' },
  { code: '+267', flag: '🇧🇼', name: 'Botsuana' },
  { code: '+268', flag: '🇸🇿', name: 'Esuatini' },
  { code: '+269', flag: '🇰🇲', name: 'Comoras' },
  { code: '+291', flag: '🇪🇷', name: 'Eritrea' },
  { code: '+297', flag: '🇦🇼', name: 'Aruba' },
  { code: '+298', flag: '🇫🇴', name: 'Islas Feroe' },
  { code: '+299', flag: '🇬🇱', name: 'Groenlandia' },
  { code: '+350', flag: '🇬🇮', name: 'Gibraltar' },
  { code: '+351', flag: '🇵🇹', name: 'Portugal' },
  { code: '+352', flag: '🇱🇺', name: 'Luxemburgo' },
  { code: '+353', flag: '🇮🇪', name: 'Irlanda' },
  { code: '+354', flag: '🇮🇸', name: 'Islandia' },
  { code: '+355', flag: '🇦🇱', name: 'Albania' },
  { code: '+356', flag: '🇲🇹', name: 'Malta' },
  { code: '+357', flag: '🇨🇾', name: 'Chipre' },
  { code: '+358', flag: '🇫🇮', name: 'Finlandia' },
  { code: '+359', flag: '🇧🇬', name: 'Bulgaria' },
  { code: '+370', flag: '🇱🇹', name: 'Lituania' },
  { code: '+371', flag: '🇱🇻', name: 'Letonia' },
  { code: '+372', flag: '🇪🇪', name: 'Estonia' },
  { code: '+373', flag: '🇲🇩', name: 'Moldavia' },
  { code: '+374', flag: '🇦🇲', name: 'Armenia' },
  { code: '+375', flag: '🇧🇾', name: 'Bielorrusia' },
  { code: '+376', flag: '🇦🇩', name: 'Andorra' },
  { code: '+377', flag: '🇲🇨', name: 'Mónaco' },
  { code: '+378', flag: '🇸🇲', name: 'San Marino' },
  { code: '+380', flag: '🇺🇦', name: 'Ucrania' },
  { code: '+381', flag: '🇷🇸', name: 'Serbia' },
  { code: '+382', flag: '🇲🇪', name: 'Montenegro' },
  { code: '+385', flag: '🇭🇷', name: 'Croacia' },
  { code: '+386', flag: '🇸🇮', name: 'Eslovenia' },
  { code: '+387', flag: '🇧🇦', name: 'Bosnia y Herzegovina' },
  { code: '+389', flag: '🇲🇰', name: 'Macedonia del Norte' },
  { code: '+420', flag: '🇨🇿', name: 'Chequia' },
  { code: '+421', flag: '🇸🇰', name: 'Eslovaquia' },
  { code: '+423', flag: '🇱🇮', name: 'Liechtenstein' },
  { code: '+500', flag: '🇫🇰', name: 'Islas Malvinas' },
  { code: '+501', flag: '🇧🇿', name: 'Belice' },
  { code: '+502', flag: '🇬🇹', name: 'Guatemala' },
  { code: '+503', flag: '🇸🇻', name: 'El Salvador' },
  { code: '+504', flag: '🇭🇳', name: 'Honduras' },
  { code: '+505', flag: '🇳🇮', name: 'Nicaragua' },
  { code: '+506', flag: '🇨🇷', name: 'Costa Rica' },
  { code: '+507', flag: '🇵🇦', name: 'Panamá' },
  { code: '+508', flag: '🇵🇲', name: 'San Pedro y Miquelón' },
  { code: '+509', flag: '🇭🇹', name: 'Haití' },
  { code: '+590', flag: '🇬🇵', name: 'Guadalupe' },
  { code: '+591', flag: '🇧🇴', name: 'Bolivia' },
  { code: '+592', flag: '🇬🇾', name: 'Guyana' },
  { code: '+593', flag: '🇪🇨', name: 'Ecuador' },
  { code: '+595', flag: '🇵🇾', name: 'Paraguay' },
  { code: '+596', flag: '🇲🇶', name: 'Martinica' },
  { code: '+597', flag: '🇸🇷', name: 'Surinam' },
  { code: '+598', flag: '🇺🇾', name: 'Uruguay' },
  { code: '+599', flag: '🇧🇶', name: 'Antillas Neerlandesas' },
  { code: '+670', flag: '🇹🇱', name: 'Timor Oriental' },
  { code: '+672', flag: '🇳🇫', name: 'Isla Norfolk' },
  { code: '+673', flag: '🇧🇳', name: 'Brunéi' },
  { code: '+674', flag: '🇳🇷', name: 'Nauru' },
  { code: '+675', flag: '🇵🇬', name: 'Papúa Nueva Guinea' },
  { code: '+676', flag: '🇹🇴', name: 'Tonga' },
  { code: '+677', flag: '🇸🇧', name: 'Islas Salomón' },
  { code: '+678', flag: '🇻🇺', name: 'Vanuatu' },
  { code: '+679', flag: '🇫🇯', name: 'Fiyi' },
  { code: '+680', flag: '🇵🇼', name: 'Palaos' },
  { code: '+682', flag: '🇨🇰', name: 'Islas Cook' },
  { code: '+685', flag: '🇼🇸', name: 'Samoa' },
  { code: '+686', flag: '🇰🇮', name: 'Kiribati' },
  { code: '+687', flag: '🇳🇨', name: 'Nueva Caledonia' },
  { code: '+688', flag: '🇹🇻', name: 'Tuvalu' },
  { code: '+689', flag: '🇵🇫', name: 'Polinesia Francesa' },
  { code: '+690', flag: '🇹🇰', name: 'Tokelau' },
  { code: '+691', flag: '🇫🇲', name: 'Micronesia' },
  { code: '+692', flag: '🇲🇭', name: 'Islas Marshall' },
  { code: '+850', flag: '🇰🇵', name: 'Corea del Norte' },
  { code: '+852', flag: '🇭🇰', name: 'Hong Kong' },
  { code: '+853', flag: '🇲🇴', name: 'Macao' },
  { code: '+855', flag: '🇰🇭', name: 'Camboya' },
  { code: '+856', flag: '🇱🇦', name: 'Laos' },
  { code: '+880', flag: '🇧🇩', name: 'Bangladés' },
  { code: '+886', flag: '🇹🇼', name: 'Taiwán' },
  { code: '+960', flag: '🇲🇻', name: 'Maldivas' },
  { code: '+961', flag: '🇱🇧', name: 'Líbano' },
  { code: '+962', flag: '🇯🇴', name: 'Jordania' },
  { code: '+963', flag: '🇸🇾', name: 'Siria' },
  { code: '+964', flag: '🇮🇶', name: 'Irak' },
  { code: '+965', flag: '🇰🇼', name: 'Kuwait' },
  { code: '+966', flag: '🇸🇦', name: 'Arabia Saudí' },
  { code: '+967', flag: '🇾🇪', name: 'Yemen' },
  { code: '+968', flag: '🇴🇲', name: 'Omán' },
  { code: '+970', flag: '🇵🇸', name: 'Palestina' },
  { code: '+971', flag: '🇦🇪', name: 'Emiratos Árabes Unidos' },
  { code: '+972', flag: '🇮🇱', name: 'Israel' },
  { code: '+973', flag: '🇧🇭', name: 'Baréin' },
  { code: '+974', flag: '🇶🇦', name: 'Catar' },
  { code: '+975', flag: '🇧🇹', name: 'Bután' },
  { code: '+976', flag: '🇲🇳', name: 'Mongolia' },
  { code: '+977', flag: '🇳🇵', name: 'Nepal' },
  { code: '+992', flag: '🇹🇯', name: 'Tayikistán' },
  { code: '+993', flag: '🇹🇲', name: 'Turkmenistán' },
  { code: '+994', flag: '🇦🇿', name: 'Azerbaiyán' },
  { code: '+995', flag: '🇬🇪', name: 'Georgia' },
  { code: '+996', flag: '🇰🇬', name: 'Kirguistán' },
  { code: '+998', flag: '🇺🇿', name: 'Uzbekistán' },
];

export function parseTelefono(raw: string): { prefix: string; number: string } {
  if (!raw) return { prefix: '+34', number: '' };
  const match = raw.match(/^(\+\d{1,4})\s*(.*)$/);
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
  const [search, setSearch] = useState('');
  const [customMode, setCustomMode] = useState(false);
  const [customCode, setCustomCode] = useState('');

  useEffect(() => {
    const p = parseTelefono(value);
    setPrefix(p.prefix);
    setNumber(p.number);
  }, [value]);

  const selected = ALL_COUNTRIES.find(c => c.code === prefix);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return ALL_COUNTRIES;
    return ALL_COUNTRIES.filter(
      c => c.name.toLowerCase().includes(q) || c.code.includes(q)
    );
  }, [search]);

  const handleNumberChange = (num: string) => {
    setNumber(num);
    onChange(num ? `${prefix} ${num}` : '');
  };

  const handlePrefixSelect = (code: string) => {
    setPrefix(code);
    setModalVisible(false);
    setSearch('');
    setCustomMode(false);
    onChange(number ? `${code} ${number}` : '');
  };

  const handleCustomConfirm = () => {
    const cleaned = customCode.startsWith('+') ? customCode : `+${customCode}`;
    if (cleaned.length < 2) return;
    handlePrefixSelect(cleaned);
  };

  return (
    <View style={styles.row}>
      <TouchableOpacity style={styles.prefixBtn} onPress={() => setModalVisible(true)}>
        {selected ? (
          <Text style={styles.flag}>{selected.flag}</Text>
        ) : (
          <Text style={styles.flagCustom}>🌐</Text>
        )}
        <Text style={styles.code}>{prefix}</Text>
        <Text style={styles.chevron}>▾</Text>
      </TouchableOpacity>

      <TextInput
        style={[styles.input, inputStyle]}
        value={number}
        onChangeText={handleNumberChange}
        placeholder="600 000 000"
        placeholderTextColor={colors.textSecondary}
        keyboardType="phone-pad"
        returnKeyType="done"
      />

      <Modal visible={modalVisible} animationType="slide" transparent>
        <SafeAreaView style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Seleccionar prefijo</Text>

            <TextInput
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder="Buscar país o código..."
              placeholderTextColor={colors.textSecondary}
              autoCapitalize="none"
              clearButtonMode="while-editing"
            />

            <FlatList
              data={filtered}
              keyExtractor={item => item.code}
              keyboardShouldPersistTaps="handled"
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

            {customMode ? (
              <View style={styles.customRow}>
                <TextInput
                  style={styles.customInput}
                  value={customCode}
                  onChangeText={setCustomCode}
                  placeholder="+XX"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="phone-pad"
                  autoFocus
                />
                <TouchableOpacity style={styles.customConfirm} onPress={handleCustomConfirm}>
                  <Text style={styles.customConfirmText}>Usar</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.customBtn} onPress={() => setCustomMode(true)}>
                <Text style={styles.customBtnText}>✏️ Escribir prefijo manualmente</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.closeBtn} onPress={() => { setModalVisible(false); setSearch(''); setCustomMode(false); }}>
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
    backgroundColor: colors.white,
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
    backgroundColor: colors.white,
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
  },
  flag: { fontSize: 18 },
  flagCustom: { fontSize: 16 },
  code: { fontSize: 14, color: colors.text, fontWeight: '600' },
  chevron: { fontSize: 12, color: colors.textSecondary },
  input: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.white,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalBox: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 16,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 10,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.background,
  },
  countryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 20,
    gap: 12,
  },
  countryRowSelected: { backgroundColor: '#fef2f2' },
  countryFlag: { fontSize: 22, width: 32 },
  countryName: { flex: 1, fontSize: 14, color: colors.text },
  countryCode: { fontSize: 13, color: colors.textSecondary, fontWeight: '600' },
  customRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 8,
    gap: 8,
    alignItems: 'center',
  },
  customInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: colors.text,
  },
  customConfirm: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  customConfirmText: { color: colors.white, fontWeight: 'bold' },
  customBtn: {
    marginHorizontal: 16,
    marginTop: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  customBtnText: { color: colors.primary, fontSize: 14, fontWeight: '600' },
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
