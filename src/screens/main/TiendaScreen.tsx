import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Linking,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../../theme/colors';
import api from '../../services/api';

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

const CATEGORIAS = [
  { key: '', label: 'Todo' },
  { key: 'equipacion', label: 'Equipaciones' },
  { key: 'ropa', label: 'Ropa' },
  { key: 'accesorio', label: 'Accesorios' },
];

const WHATSAPP_NUMERO = 'PENDIENTE'; // TODO: poner número real de la tienda (Soricastel)

export default function TiendaScreen() {
  const navigation = useNavigation<any>();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [categoriaActiva, setCategoriaActiva] = useState('');

  const fetchProductos = useCallback(async (cat = categoriaActiva) => {
    try {
      const params = cat ? { categoria: cat } : {};
      const { data } = await api.get('/api/productos', { params });
      setProductos(data.productos || []);
    } catch {
      setProductos([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [categoriaActiva]);

  useEffect(() => {
    setLoading(true);
    fetchProductos(categoriaActiva);
  }, [categoriaActiva]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchProductos(categoriaActiva);
  };

  const handleComprar = (producto: Producto) => {
    const msg = encodeURIComponent(
      `Hola, me interesa comprar: ${producto.nombre}${producto.temporada ? ` (${producto.temporada})` : ''}. ¿Está disponible?`
    );
    Linking.openURL(`https://wa.me/${WHATSAPP_NUMERO}?text=${msg}`);
  };

  const renderCategoria = ({ key, label }: { key: string; label: string }) => (
    <TouchableOpacity
      key={key}
      style={[styles.catChip, categoriaActiva === key && styles.catChipActive]}
      onPress={() => setCategoriaActiva(key)}
    >
      <Text style={[styles.catChipText, categoriaActiva === key && styles.catChipTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderProducto = ({ item }: { item: Producto }) => {
    const precio = parseFloat(item.precio);
    const precioAnt = item.precioAnterior ? parseFloat(item.precioAnterior) : null;
    const descuento = precioAnt ? Math.round((1 - precio / precioAnt) * 100) : null;

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('ProductoDetalle', { id: item.id })}
      >
        {item.destacado && (
          <View style={styles.badgeDestacado}>
            <Text style={styles.badgeText}>Destacado</Text>
          </View>
        )}
        {descuento && (
          <View style={styles.badgeDescuento}>
            <Text style={styles.badgeText}>-{descuento}%</Text>
          </View>
        )}
        {item.imagen ? (
          <Image source={{ uri: item.imagen }} style={styles.imagen} resizeMode="cover" />
        ) : (
          <View style={styles.imagenPlaceholder}>
            <Text style={styles.imagenPlaceholderText}>⚽</Text>
          </View>
        )}
        <View style={styles.cardBody}>
          {item.temporada && (
            <Text style={styles.temporada}>Temporada {item.temporada}</Text>
          )}
          <Text style={styles.nombre}>{item.nombre}</Text>
          {item.descripcion ? (
            <Text style={styles.descripcion} numberOfLines={2}>{item.descripcion}</Text>
          ) : null}
          {item.tallas && item.tallas.length > 0 && (
            <View style={styles.tallasRow}>
              {item.tallas.map((t) => (
                <View key={t} style={styles.tallaChip}>
                  <Text style={styles.tallaText}>{t}</Text>
                </View>
              ))}
            </View>
          )}
          <View style={styles.precioRow}>
            <View>
              <Text style={styles.precio}>{precio.toFixed(2)} €</Text>
              {precioAnt && (
                <Text style={styles.precioAnterior}>{precioAnt.toFixed(2)} €</Text>
              )}
            </View>
            <TouchableOpacity style={styles.btnComprar} onPress={() => handleComprar(item)}>
              <Text style={styles.btnComprarText}>Consultar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.center} edges={['top']}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>🛍️ Tienda Oficial</Text>
        <Text style={styles.headerSub}>Equipaciones y merchandising oficial</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categorias} contentContainerStyle={styles.categoriasContent}>
        {CATEGORIAS.map(renderCategoria)}
      </ScrollView>

      <TouchableOpacity
        style={styles.webBanner}
        onPress={() => Linking.openURL('https://algecirasclubdefutbol.com/tienda/')}
      >
        <Text style={styles.webBannerText}>🌐 Ver tienda online completa →</Text>
      </TouchableOpacity>

      {productos.length === 0 ? (
        <View style={styles.center}>
          <Text style={{ fontSize: 52, marginBottom: 14 }}>⚽</Text>
          <Text style={{ fontSize: 17, fontWeight: 'bold', color: colors.primary, marginBottom: 8, textAlign: 'center' }}>Tienda en preparación</Text>
          <Text style={{ textAlign: 'center', color: colors.textSecondary, fontSize: 14, lineHeight: 20, marginBottom: 20, paddingHorizontal: 32 }}>Los productos oficiales del Algeciras CF estarán disponibles próximamente.</Text>
          <TouchableOpacity
            style={{ backgroundColor: colors.primary, paddingVertical: 12, paddingHorizontal: 28, borderRadius: 8 }}
            onPress={() => Linking.openURL('https://algecirasclubdefutbol.com/tienda/')}
          >
            <Text style={{ color: 'white', fontWeight: 'bold' }}>Ver tienda web</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={productos}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderProducto}
          contentContainerStyle={styles.lista}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.primary,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.white,
  },
  headerSub: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 2 },
  webBanner: { backgroundColor: '#f5c518', paddingVertical: 10, paddingHorizontal: 16, alignItems: 'center' },
  webBannerText: { color: '#1a1a1a', fontWeight: 'bold', fontSize: 13 },
  categorias: {
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    maxHeight: 52,
  },
  categoriasContent: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    flexDirection: 'row',
  },
  catChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
  },
  catChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  catChipText: {
    fontSize: 13,
    color: colors.text,
  },
  catChipTextActive: {
    color: colors.white,
    fontWeight: '600',
  },
  lista: {
    padding: 12,
    gap: 12,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  imagen: {
    width: '100%',
    height: 200,
    backgroundColor: colors.border,
  },
  imagenPlaceholder: {
    width: '100%',
    height: 160,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagenPlaceholderText: {
    fontSize: 48,
  },
  badgeDestacado: {
    position: 'absolute',
    top: 10,
    left: 10,
    zIndex: 1,
    backgroundColor: colors.secondary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  badgeDescuento: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 1,
    backgroundColor: colors.error,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  badgeText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: 'bold',
  },
  cardBody: {
    padding: 14,
  },
  temporada: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  nombre: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 6,
  },
  descripcion: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: 8,
  },
  tallasRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 10,
  },
  tallaChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginRight: 4,
    marginBottom: 4,
  },
  tallaText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  precioRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  precio: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  precioAnterior: {
    fontSize: 13,
    color: colors.textSecondary,
    textDecorationLine: 'line-through',
  },
  btnComprar: {
    backgroundColor: colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
  },
  btnComprarText: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: 14,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 15,
  },
});
