import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator,
  TouchableOpacity, Image, Linking, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import api from '../../services/api';
import { colors } from '../../theme/colors';
import { MainStackParamList } from '../../navigation/MainStack';

interface Producto {
  id: number;
  nombre: string;
  descripcion: string;
  precio: string;
  precioAnterior: string | null;
  imagen: string | null;
  imagenes: string[];
  categoria: string;
  tallas: string[];
  temporada: string | null;
  destacado: boolean;
}

const WHATSAPP_NUMERO = 'PENDIENTE';
const SCREEN_W = Dimensions.get('window').width;

export default function ProductoDetalleScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<MainStackParamList, 'ProductoDetalle'>>();
  const { id } = route.params;

  const [producto, setProducto] = useState<Producto | null>(null);
  const [loading, setLoading] = useState(true);
  const [tallaSel, setTallaSel] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Try GET by id first; fall back to filter from list
        try {
          const { data } = await api.get(`/api/productos/${id}`);
          const p = data?.producto ?? data;
          if (!cancelled && p) { setProducto(p); return; }
        } catch {}
        const { data } = await api.get('/api/productos');
        const lista: Producto[] = data?.productos ?? [];
        const found = lista.find((p) => p.id === id) ?? null;
        if (!cancelled) setProducto(found);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  const handleWhatsapp = () => {
    if (!producto) return;
    const tallaTxt = tallaSel ? ` Talla: ${tallaSel}.` : '';
    const msg = encodeURIComponent(
      `Hola, me interesa: ${producto.nombre}${producto.temporada ? ` (${producto.temporada})` : ''}.${tallaTxt} ¿Está disponible?`
    );
    Linking.openURL(`https://wa.me/${WHATSAPP_NUMERO}?text=${msg}`);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!producto) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backText}>← Volver</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Producto</Text>
          <View style={{ width: 60 }} />
        </View>
        <View style={styles.center}>
          <Text style={styles.empty}>Producto no encontrado</Text>
        </View>
      </SafeAreaView>
    );
  }

  const precio = parseFloat(producto.precio);
  const precioAnt = producto.precioAnterior ? parseFloat(producto.precioAnterior) : null;
  const imagenes = (producto.imagenes && producto.imagenes.length > 0)
    ? producto.imagenes
    : (producto.imagen ? [producto.imagen] : []);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Volver</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{producto.nombre}</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        {imagenes.length > 1 ? (
          <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
            {imagenes.map((img, i) => (
              <Image key={i} source={{ uri: img }} style={styles.imageHero} resizeMode="cover" />
            ))}
          </ScrollView>
        ) : imagenes.length === 1 ? (
          <Image source={{ uri: imagenes[0] }} style={styles.imageHero} resizeMode="cover" />
        ) : (
          <View style={[styles.imageHero, styles.imagePlaceholder]}>
            <Text style={{ fontSize: 64 }}>⚽</Text>
          </View>
        )}

        <View style={styles.body}>
          {producto.temporada ? (
            <Text style={styles.temporada}>Temporada {producto.temporada}</Text>
          ) : null}
          <Text style={styles.nombre}>{producto.nombre}</Text>

          <View style={styles.precioRow}>
            <Text style={styles.precio}>{precio.toFixed(2)} €</Text>
            {precioAnt ? (
              <Text style={styles.precioAnterior}>{precioAnt.toFixed(2)} €</Text>
            ) : null}
          </View>

          {producto.descripcion ? (
            <Text style={styles.descripcion}>{producto.descripcion}</Text>
          ) : null}

          {producto.tallas && producto.tallas.length > 0 && (
            <View style={styles.tallasBlock}>
              <Text style={styles.tallasLabel}>Talla</Text>
              <View style={styles.tallasRow}>
                {producto.tallas.map((t) => {
                  const sel = tallaSel === t;
                  return (
                    <TouchableOpacity
                      key={t}
                      style={[styles.tallaChip, sel && styles.tallaChipSel]}
                      onPress={() => setTallaSel(sel ? null : t)}
                    >
                      <Text style={[styles.tallaText, sel && styles.tallaTextSel]}>{t}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          <TouchableOpacity style={styles.whatsappBtn} onPress={handleWhatsapp}>
            <Text style={styles.whatsappText}>Consultar en WhatsApp</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  backBtn: { paddingVertical: 4, paddingHorizontal: 8 },
  backText: { color: colors.white, fontSize: 14, fontWeight: '600' },
  headerTitle: { color: colors.white, fontSize: 16, fontWeight: 'bold', flex: 1, textAlign: 'center' },
  container: { paddingBottom: 32 },
  imageHero: { width: SCREEN_W, height: 320, backgroundColor: colors.border },
  imagePlaceholder: { alignItems: 'center', justifyContent: 'center' },
  body: { padding: 16 },
  temporada: {
    fontSize: 11, color: colors.primary, fontWeight: '600',
    textTransform: 'uppercase', marginBottom: 4,
  },
  nombre: { fontSize: 22, fontWeight: 'bold', color: colors.text, marginBottom: 8 },
  precioRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10, marginBottom: 14 },
  precio: { fontSize: 24, fontWeight: 'bold', color: colors.primary },
  precioAnterior: { fontSize: 15, color: colors.textSecondary, textDecorationLine: 'line-through' },
  descripcion: { fontSize: 14, color: colors.text, lineHeight: 20, marginBottom: 16 },
  tallasBlock: { marginBottom: 18 },
  tallasLabel: { fontSize: 13, fontWeight: 'bold', color: colors.text, marginBottom: 8 },
  tallasRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tallaChip: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: colors.white,
  },
  tallaChipSel: { borderColor: colors.primary, backgroundColor: colors.primary },
  tallaText: { fontSize: 13, color: colors.text, fontWeight: '600' },
  tallaTextSel: { color: colors.white },
  whatsappBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  whatsappText: { color: colors.white, fontWeight: 'bold', fontSize: 15 },
  empty: { textAlign: 'center', color: colors.textSecondary, paddingVertical: 12 },
});
