import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery } from "convex/react";
import * as Location from "expo-location";

import { api } from "@/convex/_generated/api";
import { I18nText as Text, I18nTextInput as TextInput } from "@/src/i18n";
import { safeAlert } from "@/src/components/ui/alert/safeAlert";

const DEMO_STORE = {
  id: "carrefour-los-fresnos",
  name: "Carrefour Los Fresnos",
  address: "Centro Comercial Los Fresnos, 33206 Gijón",
  radiusMeters: 300,
  latitude: 43.53263,
  longitude: -5.661265,
};

const MAX_MESSAGE_LENGTH = 280;

function distanceToStoreMeters(latitude, longitude) {
  const toRadians = value => (value * Math.PI) / 180;
  const earthRadiusMeters = 6371000;
  const deltaLatitude = toRadians(DEMO_STORE.latitude - latitude);
  const deltaLongitude = toRadians(DEMO_STORE.longitude - longitude);
  const latitude1 = toRadians(latitude);
  const latitude2 = toRadians(DEMO_STORE.latitude);
  const a =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(latitude1) *
      Math.cos(latitude2) *
      Math.sin(deltaLongitude / 2) ** 2;
  return earthRadiusMeters * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatTime(timestamp) {
  if (!timestamp) return "";

  try {
    return new Intl.DateTimeFormat("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(timestamp));
  } catch {
    return "";
  }
}

function MessageBubble({ item, mine }) {
  return (
    <View
      style={[
        styles.messageRow,
        mine ? styles.messageRowMine : styles.messageRowOther,
      ]}
    >
      <View
        style={[
          styles.messageBubble,
          mine ? styles.messageBubbleMine : styles.messageBubbleOther,
        ]}
      >
        {!mine ? (
          <Text style={styles.alias} numberOfLines={1}>
            {item.username || "Usuario"}
          </Text>
        ) : null}

        <Text style={styles.messageText}>{item.text}</Text>

        <Text style={styles.messageTime}>
          {mine ? "Tú · " : ""}
          {formatTime(item.createdAt || item._creationTime)}
        </Text>
      </View>
    </View>
  );
}

export default function ChatPrototypeScreen() {
  const listRef = useRef(null);

  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [location, setLocation] = useState(null);
  const [locationState, setLocationState] = useState("checking");

  const checkLocation = useCallback(async () => {
    setLocationState("checking");
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") {
        setLocation(null);
        setLocationState("denied");
        return null;
      }
      const result = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const nextLocation = {
        latitude: result.coords.latitude,
        longitude: result.coords.longitude,
      };
      const nearby =
        distanceToStoreMeters(nextLocation.latitude, nextLocation.longitude) <=
        DEMO_STORE.radiusMeters;
      setLocation(nextLocation);
      setLocationState(nearby ? "ready" : "outside");
      return nearby ? nextLocation : null;
    } catch (error) {
      console.error("[ChatPrototypeScreen] location failed", error);
      setLocation(null);
      setLocationState("error");
      return null;
    }
  }, []);

  useEffect(() => {
    checkLocation();
  }, [checkLocation]);

  const currentUser = useQuery(api.users.current);
  const messages = useQuery(
    api.chat.listMessages,
    location && locationState === "ready"
      ? {
          room: DEMO_STORE.id,
          latitude: location.latitude,
          longitude: location.longitude,
        }
      : "skip",
  );
  const sendMessage = useMutation(api.chat.sendMessage);

  const currentUserId = currentUser?._id ? String(currentUser._id) : null;

  const displayAlias = useMemo(() => {
    return (
      currentUser?.profile?.alias ||
      currentUser?.name ||
      currentUser?.email ||
      "Usuario"
    );
  }, [currentUser]);

  const canSend =
    text.trim().length > 0 &&
    !sending &&
    currentUser !== null &&
    locationState === "ready";

  const handleSend = useCallback(async () => {
    const cleanText = text.trim();

    if (!cleanText || sending) return;

    if (!currentUser) {
      safeAlert(
        "Usuario no autenticado",
        "Debes iniciar sesión para participar en el chat de la tienda.",
      );
      return;
    }

    if (cleanText.length > MAX_MESSAGE_LENGTH) {
      safeAlert(
        "Mensaje demasiado largo",
        `El mensaje no puede superar ${MAX_MESSAGE_LENGTH} caracteres.`,
      );
      return;
    }

    setSending(true);

    try {
      const currentLocation = await checkLocation();
      if (!currentLocation) {
        throw new Error("No se pudo comprobar que estás cerca de la tienda.");
      }
      await sendMessage({
        room: DEMO_STORE.id,
        username: displayAlias,
        text: cleanText,
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
      });

      setText("");

      requestAnimationFrame(() => {
        listRef.current?.scrollToEnd?.({ animated: true });
      });
    } catch (error) {
      console.error("[ChatPrototypeScreen] sendMessage failed", error);
      safeAlert(
        "No se pudo enviar",
        error?.message || "No se pudo enviar el mensaje.",
      );
    } finally {
      setSending(false);
    }
  }, [checkLocation, currentUser, displayAlias, sendMessage, sending, text]);

  const renderItem = useCallback(
    ({ item }) => {
      const mine =
        Boolean(currentUserId) && String(item.userId || "") === currentUserId;

      return <MessageBubble item={item} mine={mine} />;
    },
    [currentUserId],
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
      >
        <View style={styles.header}>
          <View style={styles.placeIcon}>
            <Ionicons name="storefront-outline" size={22} color="#1D4ED8" />
          </View>

          <View style={styles.headerText}>
            <Text style={styles.title}>{DEMO_STORE.name}</Text>
            <Text style={styles.subtitle}>
              {DEMO_STORE.address} · radio de {DEMO_STORE.radiusMeters} m
            </Text>
          </View>

          <View style={styles.devBadge}>
            <Text style={styles.devBadgeText}>DEV</Text>
          </View>
        </View>

        <FlatList
          ref={listRef}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          data={Array.isArray(messages) ? messages : []}
          keyExtractor={(item) => String(item._id)}
          renderItem={renderItem}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() =>
            listRef.current?.scrollToEnd?.({ animated: false })
          }
          ListHeaderComponent={
            <View style={styles.notice}>
              <Ionicons
                name="information-circle-outline"
                size={18}
                color="#4B5563"
              />
              <Text style={styles.noticeText}>
                {locationState === "checking"
                  ? "Comprobando si estás cerca de la tienda…"
                  : locationState === "denied"
                    ? "Activa el permiso de ubicación para acceder a este chat."
                    : locationState === "error"
                      ? "No se pudo obtener tu ubicación. Pulsa para intentarlo de nuevo."
                      : locationState === "outside"
                        ? "Estás fuera del radio de 300 metros de Carrefour Los Fresnos."
                      : "El chat solo está disponible para personas situadas cerca de Carrefour Los Fresnos."}
              </Text>
              {locationState !== "ready" && locationState !== "checking" ? (
                <Pressable onPress={checkLocation} style={styles.retryButton}>
                  <Text style={styles.retryButtonText}>Reintentar</Text>
                </Pressable>
              ) : null}
            </View>
          }
          ListEmptyComponent={
            messages === undefined ? (
              <Text style={styles.emptyText}>Cargando mensajes…</Text>
            ) : (
              <Text style={styles.emptyText}>
                Todavía no hay mensajes en esta tienda.
              </Text>
            )
          }
        />

        <View style={styles.composer}>
          <View style={styles.inputBlock}>
            <TextInput
              style={styles.input}
              value={text}
              onChangeText={setText}
              placeholder="Escribe un mensaje para esta tienda…"
              placeholderTextColor="#9CA3AF"
              multiline
              maxLength={MAX_MESSAGE_LENGTH}
              returnKeyType="send"
              blurOnSubmit={false}
              onSubmitEditing={handleSend}
              accessibilityLabel="Mensaje para el chat de la tienda"
            />

            <Text style={styles.counter}>
              {text.length}/{MAX_MESSAGE_LENGTH}
            </Text>
          </View>

          <Pressable
            onPress={handleSend}
            disabled={!canSend}
            style={({ pressed }) => [
              styles.sendButton,
              !canSend && styles.sendButtonDisabled,
              pressed && canSend && styles.sendButtonPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Enviar mensaje"
          >
            <Ionicons name="send" size={19} color="#FFFFFF" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  container: {
    flex: 1,
    backgroundColor: "#F4F7FB",
  },
  retryButton: {
    marginLeft: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#DBEAFE",
  },
  retryButtonText: {
    color: "#1D4ED8",
    fontWeight: "700",
  },
  header: {
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#D1D5DB",
  },
  placeIcon: {
    width: 42,
    height: 42,
    marginRight: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EAF2FF",
    borderRadius: 13,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    color: "#172033",
    fontSize: 17,
    fontWeight: "800",
  },
  subtitle: {
    marginTop: 3,
    color: "#667085",
    fontSize: 12,
  },
  devBadge: {
    marginLeft: 8,
    paddingHorizontal: 7,
    paddingVertical: 4,
    backgroundColor: "#FFF1E7",
    borderRadius: 8,
  },
  devBadgeText: {
    color: "#C2410C",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.4,
  },
  list: {
    flex: 1,
  },
  listContent: {
    flexGrow: 1,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 16,
  },
  notice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 11,
    marginBottom: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E4E7EC",
    borderRadius: 14,
  },
  noticeText: {
    flex: 1,
    color: "#4B5563",
    fontSize: 12,
    lineHeight: 18,
  },
  emptyText: {
    marginTop: 26,
    color: "#667085",
    fontSize: 13,
    textAlign: "center",
  },
  messageRow: {
    marginBottom: 8,
  },
  messageRowMine: {
    alignItems: "flex-end",
  },
  messageRowOther: {
    alignItems: "flex-start",
  },
  messageBubble: {
    maxWidth: "84%",
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 6,
    borderWidth: 1,
    borderRadius: 15,
  },
  messageBubbleMine: {
    backgroundColor: "#EAF2FF",
    borderColor: "#BFDBFE",
  },
  messageBubbleOther: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E4E7EC",
  },
  alias: {
    marginBottom: 3,
    color: "#2563EB",
    fontSize: 12,
    fontWeight: "800",
  },
  messageText: {
    color: "#172033",
    fontSize: 15,
    lineHeight: 20,
  },
  messageTime: {
    marginTop: 5,
    alignSelf: "flex-end",
    color: "#667085",
    fontSize: 10,
  },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 9,
    backgroundColor: "#FFFFFF",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#D1D5DB",
  },
  inputBlock: {
    flex: 1,
  },
  input: {
    minHeight: 42,
    maxHeight: 110,
    paddingHorizontal: 12,
    paddingTop: Platform.OS === "ios" ? 10 : 8,
    paddingBottom: Platform.OS === "ios" ? 10 : 8,
    color: "#172033",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 13,
    fontSize: 15,
  },
  counter: {
    marginTop: 3,
    marginRight: 3,
    alignSelf: "flex-end",
    color: "#98A2B3",
    fontSize: 9,
  },
  sendButton: {
    width: 44,
    height: 44,
    marginBottom: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2563EB",
    borderRadius: 13,
  },
  sendButtonDisabled: {
    opacity: 0.35,
  },
  sendButtonPressed: {
    opacity: 0.82,
  },
});
