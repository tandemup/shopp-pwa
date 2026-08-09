import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { Image } from "expo-image";

import { ROUTES } from "@/src/navigation/ROUTES";

import { useProductLookupWithCache } from "@/src/hooks/useProductLookupWithCache";
import { normalizeBarcode } from "@/src/utils/barcodeNormalization";
import {
  getProductBrand,
  getProductCategory,
  getProductDisplayName,
  getProductImageUrl,
  getProductUrl,
} from "@/src/services/productLookup";

export default function ProductInfoScreen({ route, navigation }) {
  const { width } = useWindowDimensions();
  const isWideScreen = width >= 760;
  const horizontalPadding = width >= 1100 ? 28 : 16;
  const params = route?.params || {};

  const barcode = normalizeBarcode(
    params.barcode || params.scannedBarcode || params.code || params.data,
  );

  const initialProduct = params.product || null;
  const initialFromCache = Boolean(params.fromCache);

  const { loading, error, lookupWithCache } = useProductLookupWithCache();

  const [product, setProduct] = useState(initialProduct);
  const [fromCache, setFromCache] = useState(initialFromCache);
  const [localError, setLocalError] = useState(null);

  const loadedBarcodeRef = useRef(null);

  const displayName = useMemo(
    () => getProductDisplayName(product, barcode),
    [product, barcode],
  );

  const brand = useMemo(() => getProductBrand(product), [product]);

  const imageUrl = useMemo(() => getProductImageUrl(product), [product]);

  const category = useMemo(() => getProductCategory(product), [product]);

  const productUrl = useMemo(
    () => getProductUrl(product, barcode),
    [product, barcode],
  );

  const loadProduct = useCallback(
    async ({ force = false } = {}) => {
      if (!barcode) {
        setLocalError("No se ha recibido ningún código de barras.");
        return;
      }

      if (!force && loadedBarcodeRef.current === barcode) {
        return;
      }

      loadedBarcodeRef.current = barcode;
      setLocalError(null);

      try {
        const result = await lookupWithCache(barcode, {
          forceRefresh: force,
        });

        if (!result) {
          return;
        }

        setProduct(result.product);
        setFromCache(result.fromCache);
      } catch (err) {
        console.error("ProductInfoScreen loadProduct error:", err);
        setLocalError(
          err?.message || "No se pudo obtener la información del producto.",
        );
      }
    },
    [barcode, lookupWithCache],
  );

  useEffect(() => {
    if (initialProduct) {
      loadedBarcodeRef.current = barcode;
      return;
    }

    loadProduct();
  }, [barcode, initialProduct, loadProduct]);

  const handleOpenProductUrl = useCallback(async () => {
    if (!productUrl) {
      return;
    }

    const canOpen = await Linking.canOpenURL(productUrl);

    if (canOpen) {
      await Linking.openURL(productUrl);
    }
  }, [productUrl]);

  const handleRefresh = useCallback(() => {
    loadedBarcodeRef.current = null;
    loadProduct({ force: true });
  }, [loadProduct]);

  const handleGoogleProductSearch = useCallback(async () => {
    if (!barcode) {
      setLocalError("No se ha recibido ningún código de barras.");
      return;
    }

    try {
      setLocalError(null);
      const url = `https://www.google.com/search?q=${encodeURIComponent(
        `${barcode}`,
      )}`;
      await Linking.openURL(url);
    } catch (err) {
      setLocalError(err?.message || "No se pudo abrir la búsqueda de Google.");
    }
  }, [barcode]);

  const handleGoogleShoppingSearch = useCallback(async () => {
    if (!barcode) {
      setLocalError("No se ha recibido ningún código de barras.");
      return;
    }

    try {
      setLocalError(null);
      const url = `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(
        barcode,
      )}`;
      await Linking.openURL(url);
    } catch (err) {
      setLocalError(err?.message || "No se pudo abrir Google Shopping.");
    }
  }, [barcode]);

  const handleEdit = useCallback(() => {
    navigation.navigate(ROUTES.EDIT_SCANNED_ITEM, {
      barcode,
      product,
      item: product,
    });
  }, [navigation, barcode, product]);

  const visibleError = localError || error;

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingHorizontal: horizontalPadding },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.headerCard}>
          <Text style={styles.eyebrow}>Código de barras</Text>
          <Text style={styles.barcode}>{barcode || "Sin código"}</Text>

          <View style={styles.sourceRow}>
            <View
              style={[
                styles.sourceBadge,
                fromCache ? styles.cacheBadge : styles.internetBadge,
              ]}
            >
              <Text style={styles.sourceBadgeText}>
                {fromCache ? "Caché Convex" : "Internet"}
              </Text>
            </View>
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" />
            <Text style={styles.loadingText}>Buscando producto...</Text>
          </View>
        ) : null}

        {visibleError ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorTitle}>No se pudo cargar el producto</Text>
            <Text style={styles.errorText}>{visibleError}</Text>
          </View>
        ) : null}

        <View
          style={[styles.productCard, isWideScreen && styles.productCardWide]}
        >
          {imageUrl ? (
            <Image
              source={{ uri: imageUrl }}
              style={[
                styles.productImage,
                isWideScreen && styles.productImageWide,
              ]}
              contentFit="contain"
              cachePolicy="memory-disk"
            />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Text style={styles.imagePlaceholderText}>Sin imagen</Text>
            </View>
          )}

          <View style={isWideScreen ? styles.productDetailsWide : null}>
            <Text style={styles.productName}>{displayName}</Text>

            {brand ? (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Marca</Text>
                <Text style={styles.infoValue}>{brand}</Text>
              </View>
            ) : null}

            {category ? (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Categoría</Text>
                <Text style={styles.infoValue}>{category}</Text>
              </View>
            ) : null}

            {product?.source ? (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Fuente</Text>
                <Text style={styles.infoValue}>{product.source}</Text>
              </View>
            ) : null}

            {product?.notFound === true || product?.status === "not_found" ? (
              <View style={styles.warningBox}>
                <Text style={styles.warningText}>
                  No se encontró información detallada para este código.
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={[styles.actions, isWideScreen && styles.actionsWide]}>
          <Pressable
            style={[
              styles.primaryButton,
              isWideScreen && styles.actionsWideButton,
            ]}
            onPress={handleEdit}
          >
            <Text style={styles.primaryButtonText}>Editar producto</Text>
          </Pressable>

          <Pressable
            style={[
              styles.secondaryButton,
              isWideScreen && styles.actionsWideButton,
            ]}
            onPress={handleGoogleProductSearch}
          >
            <Text style={styles.secondaryButtonText}>
              Buscar producto en Google
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.secondaryButton,
              isWideScreen && styles.actionsWideButton,
            ]}
            onPress={handleGoogleShoppingSearch}
          >
            <Text style={styles.secondaryButtonText}>
              Buscar en Google Shopping
            </Text>
          </Pressable>

          {productUrl ? (
            <Pressable
              style={[
                styles.secondaryButton,
                isWideScreen && styles.actionsWideButton,
              ]}
              onPress={handleOpenProductUrl}
            >
              <Text style={styles.secondaryButtonText}>Abrir fuente</Text>
            </Pressable>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F4F6F8",
  },
  scroll: {
    flex: 1,
  },
  content: {
    width: "100%",
    maxWidth: 1120,
    alignSelf: "center",
    paddingBottom: 32,
  },
  headerCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6B7280",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  barcode: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
  },
  sourceRow: {
    flexDirection: "row",
    marginTop: 12,
  },
  sourceBadge: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  cacheBadge: {
    backgroundColor: "#E8F5E9",
  },
  internetBadge: {
    backgroundColor: "#E8F0FE",
  },
  sourceBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#111827",
  },
  loadingBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  loadingText: {
    marginTop: 10,
    color: "#4B5563",
    fontWeight: "600",
  },
  errorBox: {
    backgroundColor: "#FEF2F2",
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  errorTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#991B1B",
    marginBottom: 4,
  },
  errorText: {
    fontSize: 14,
    color: "#7F1D1D",
  },
  productCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  productCardWide: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 24,
    padding: 24,
  },
  productImage: {
    width: "100%",
    height: 220,
    marginBottom: 16,
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
  },
  productImageWide: {
    width: 340,
    height: 340,
    flexShrink: 0,
    marginBottom: 0,
  },
  productDetailsWide: {
    flex: 1,
    minWidth: 0,
  },
  imagePlaceholder: {
    height: 180,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  imagePlaceholderText: {
    color: "#6B7280",
    fontWeight: "700",
  },
  productName: {
    fontSize: 24,
    fontWeight: "900",
    color: "#111827",
    marginBottom: 16,
  },
  infoRow: {
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "#6B7280",
    textTransform: "uppercase",
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 15,
    color: "#111827",
    fontWeight: "600",
  },
  warningBox: {
    marginTop: 14,
    backgroundColor: "#FFFBEB",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  warningText: {
    color: "#92400E",
    fontWeight: "600",
  },
  actions: {
    marginTop: 16,
    gap: 10,
  },
  actionsWide: {
    maxWidth: 560,
    alignSelf: "center",
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
  },
  primaryButton: {
    backgroundColor: "#111827",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
  secondaryButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D1D5DB",
  },
  actionsWideButton: {
    flex: 1,
    minWidth: 240,
  },
  secondaryButtonText: {
    color: "#111827",
    fontSize: 15,
    fontWeight: "800",
  },
});
