// src/screens/ChatScreen.js
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import {
  I18nText as Text,
  I18nTextInput as TextInput,
  useI18n,
} from "@/src/i18n";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

const ROOMS = [
  { id: "compras", label: "Compras", icon: "cart-outline" },
  { id: "musica", label: "Música", icon: "musical-notes-outline" },
  { id: "humor", label: "Humor", icon: "happy-outline" },
  { id: "informatica", label: "Informática", icon: "laptop-outline" },
  { id: "noticias", label: "Noticias", icon: "newspaper-outline" },
];
const MAX_MESSAGE_LENGTH = 280;
const MAX_IMAGES = 8;
const IMAGE_PREFIX = "__SHOPP_IMAGE__:";

function encodeMessage(text, images) {
  if (!images?.length) return text;
  return `${IMAGE_PREFIX}${JSON.stringify({ text, images })}`;
}

function decodeMessage(value = "") {
  if (!value.startsWith(IMAGE_PREFIX)) return { text: value, images: [] };
  try {
    const parsed = JSON.parse(value.slice(IMAGE_PREFIX.length));
    const images = Array.isArray(parsed.images)
      ? parsed.images
      : parsed.image
        ? [parsed.image]
        : [];
    return { text: parsed.text || "", images };
  } catch {
    return { text: value, images: [] };
  }
}

function createDefaultAlias() {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    const saved = window.localStorage?.getItem("shopp-chat-alias");
    if (saved?.trim()) return saved.trim();
    const ua = window.navigator?.userAgent || "";
    if (/iPhone/i.test(ua)) return "iPhone";
    if (/iPad/i.test(ua)) return "iPad";
    if (/Android/i.test(ua)) return "Android";
    if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) return "Safari";
    if (/Chrome/i.test(ua)) return "Chrome";
  }
  return Platform.OS === "ios"
    ? "iPhone"
    : Platform.OS === "android"
      ? "Android"
      : "anonymous";
}

function saveAlias(alias) {
  if (Platform.OS !== "web" || typeof window === "undefined") return;
  try {
    window.localStorage?.setItem("shopp-chat-alias", alias);
  } catch {}
}

function formatTime(timestamp, language = "es") {
  if (!timestamp) return "";
  try {
    return new Date(timestamp).toLocaleTimeString(
      language === "en" ? "en-GB" : "es-ES",
      {
        hour: "2-digit",
        minute: "2-digit",
      },
    );
  } catch {
    return "";
  }
}

function Message({ item, myAlias, language }) {
  const mine = item.username === myAlias;
  const timestamp = item.createdAt || item._creationTime;
  const content = decodeMessage(item.text);
  return (
    <View style={[styles.messageRow, mine && styles.messageRowMine]}>
      <View style={[styles.bubble, mine && styles.bubbleMine]}>
        <View style={styles.messageHeader}>
          <Text style={styles.username} numberOfLines={1}>
            {item.username || "anonymous"}
          </Text>
          <Text style={styles.time}>{formatTime(timestamp, language)}</Text>
        </View>
        {content.images.length ? (
          <View style={styles.messageImagesPanel}>
            {content.images.map((uri, index) => (
              <Image
                key={`${item._id || item.id}-image-${index}`}
                source={{ uri }}
                style={
                  content.images.length === 1
                    ? styles.messageImageSingle
                    : styles.messageImage
                }
                resizeMode="cover"
              />
            ))}
          </View>
        ) : null}
        {content.text ? (
          <Text
            style={[
              styles.messageText,
              content.images.length > 0 && styles.messageTextAfterImage,
            ]}
          >
            {content.text}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

export default function ChatScreen() {
  const listRef = useRef(null);
  const { language } = useI18n();
  const [room, setRoom] = useState("compras");
  const [alias, setAlias] = useState(createDefaultAlias);
  const [input, setInput] = useState("");
  const [selectedImages, setSelectedImages] = useState([]);
  const [sending, setSending] = useState(false);

  const messages = useQuery(api.chat.listMessages, { room });
  const sendMessage = useMutation(api.chat.sendMessage);

  const visibleMessages = useMemo(() => {
    if (!Array.isArray(messages)) return [];
    return [...messages].sort(
      (a, b) =>
        (a.createdAt || a._creationTime || 0) -
        (b.createdAt || b._creationTime || 0),
    );
  }, [messages]);

  const cleanAlias = alias.trim() || "anonymous";
  const cleanInput = input.trim();
  const canSend =
    Boolean(cleanInput || selectedImages.length) &&
    cleanInput.length <= MAX_MESSAGE_LENGTH &&
    !sending;

  const handleAliasChange = useCallback((value) => {
    const next = value.slice(0, 40);
    setAlias(next);
    saveAlias(next);
  }, []);

  const handlePickImages = useCallback(async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        allowsMultipleSelection: true,
        selectionLimit: MAX_IMAGES,
        quality: 1,
      });
      if (result.canceled || !result.assets?.length) return;

      const resizedImages = await Promise.all(
        result.assets.slice(0, MAX_IMAGES).map(async (asset) => {
          if (!asset.uri) return null;
          const resize =
            asset.width > asset.height ? { width: 256 } : { height: 256 };
          const actions =
            Math.max(asset.width || 0, asset.height || 0) > 256
              ? [{ resize }]
              : [];
          const resized = await ImageManipulator.manipulateAsync(
            asset.uri,
            actions,
            {
              compress: 0.72,
              format: ImageManipulator.SaveFormat.JPEG,
              base64: true,
            },
          );
          return resized.base64
            ? `data:image/jpeg;base64,${resized.base64}`
            : null;
        }),
      );

      setSelectedImages((current) =>
        [...current, ...resizedImages.filter(Boolean)].slice(0, MAX_IMAGES),
      );
    } catch (error) {
      console.error("[Chat] No se pudieron seleccionar las imágenes:", error);
    }
  }, []);

  const handleRemoveImage = useCallback((indexToRemove) => {
    setSelectedImages((current) =>
      current.filter((_, index) => index !== indexToRemove),
    );
  }, []);

  const handleSend = useCallback(async () => {
    if (!canSend) return;
    setSending(true);
    try {
      await sendMessage({
        room,
        username: cleanAlias,
        text: encodeMessage(cleanInput, selectedImages),
      });
      setInput("");
      setSelectedImages([]);
      if (typeof requestAnimationFrame === "function") {
        requestAnimationFrame(() =>
          listRef.current?.scrollToEnd?.({ animated: true }),
        );
      }
    } catch (error) {
      console.error("[Chat] No se pudo enviar el mensaje:", error);
    } finally {
      setSending(false);
    }
  }, [canSend, cleanAlias, cleanInput, room, selectedImages, sendMessage]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <View style={styles.iconBox}>
              <Ionicons name="chatbubbles-outline" size={21} color="#2563eb" />
            </View>
            <View style={styles.titleBlock}>
              <Text style={styles.title}>Chat de compras</Text>
              <Text style={styles.subtitle}>
                {language === "en"
                  ? `Open room · #${room}`
                  : `Sala abierta · #${room}`}
              </Text>
            </View>
          </View>
          <View style={styles.aliasRow}>
            <Text style={styles.aliasLabel}>Alias</Text>
            <TextInput
              value={alias}
              onChangeText={handleAliasChange}
              placeholder="Tu alias"
              placeholderTextColor="#9ca3af"
              style={styles.aliasInput}
              maxLength={40}
              autoCorrect={false}
              autoCapitalize="none"
            />
          </View>
        </View>

        <View style={styles.roomsBar}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.roomsContent}
          >
            {ROOMS.map((item) => {
              const active = room === item.id;
              return (
                <Pressable
                  key={item.id}
                  onPress={() => setRoom(item.id)}
                  style={[styles.roomButton, active && styles.roomButtonActive]}
                >
                  <Ionicons
                    name={item.icon}
                    size={15}
                    color={active ? "#ffffff" : "#475569"}
                  />
                  <Text
                    style={[styles.roomText, active && styles.roomTextActive]}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        <FlatList
          ref={listRef}
          data={visibleMessages}
          keyExtractor={(item) => String(item._id || item.id)}
          renderItem={({ item }) => (
            <Message item={item} myAlias={cleanAlias} language={language} />
          )}
          style={styles.list}
          contentContainerStyle={[
            styles.listContent,
            visibleMessages.length === 0 && styles.listEmpty,
          ]}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() =>
            listRef.current?.scrollToEnd?.({ animated: false })
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons
                name="chatbubble-ellipses-outline"
                size={34}
                color="#94a3b8"
              />
              <Text style={styles.emptyTitle}>
                {messages === undefined
                  ? "Conectando con Convex…"
                  : "Todavía no hay mensajes"}
              </Text>
              <Text style={styles.emptyText}>
                Abre Shopp en otro dispositivo y usa un alias diferente para
                probar la conversación en tiempo real.
              </Text>
            </View>
          }
        />

        {selectedImages.length ? (
          <View style={styles.imagePreviewPanel}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.imagePreviewContent}
            >
              {selectedImages.map((uri, index) => (
                <View
                  key={`selected-image-${index}`}
                  style={styles.imagePreviewItem}
                >
                  <Image
                    source={{ uri }}
                    style={styles.imagePreview}
                    resizeMode="cover"
                  />
                  <Pressable
                    onPress={() => handleRemoveImage(index)}
                    style={styles.removeImageButton}
                    accessibilityLabel={`Quitar imagen ${index + 1}`}
                  >
                    <Ionicons name="close" size={16} color="#ffffff" />
                  </Pressable>
                </View>
              ))}
            </ScrollView>
            <Text style={styles.imagesCounter}>
              {selectedImages.length}/{MAX_IMAGES}
            </Text>
          </View>
        ) : null}

        <View style={styles.composer}>
          <Pressable
            onPress={handlePickImages}
            disabled={sending || selectedImages.length >= MAX_IMAGES}
            style={styles.imageButton}
            accessibilityLabel="Añadir imágenes"
          >
            <Ionicons name="image-outline" size={23} color="#2563eb" />
          </Pressable>
          <TextInput
            value={input}
            onChangeText={(value) =>
              setInput(value.slice(0, MAX_MESSAGE_LENGTH))
            }
            placeholder="Escribe un mensaje…"
            placeholderTextColor="#9ca3af"
            style={styles.messageInput}
            multiline
            maxLength={MAX_MESSAGE_LENGTH}
          />
          <Pressable
            onPress={handleSend}
            disabled={!canSend}
            style={({ pressed }) => [
              styles.sendButton,
              !canSend && styles.sendButtonDisabled,
              pressed && canSend && styles.sendButtonPressed,
            ]}
          >
            <Ionicons name="send" size={18} color="#ffffff" />
          </Pressable>
        </View>

        <View style={styles.footer}>
          <Text style={styles.counter}>
            {input.length}/{MAX_MESSAGE_LENGTH}
          </Text>
          <Text style={styles.footerText}>
            Pruebas abiertas · sin login obligatorio
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#fff" },
  screen: { flex: 1, backgroundColor: "#f3f4f6" },
  header: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 12,
    backgroundColor: "#fff",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#d1d5db",
  },
  titleRow: { flexDirection: "row", alignItems: "center" },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#eff6ff",
    marginRight: 10,
  },
  titleBlock: { flex: 1 },
  title: { fontSize: 19, fontWeight: "800", color: "#111827" },
  subtitle: { marginTop: 2, fontSize: 12, color: "#6b7280" },
  aliasRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  aliasLabel: { fontSize: 13, fontWeight: "700", color: "#4b5563" },
  aliasInput: {
    flex: 1,
    minHeight: 38,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "#fff",
    fontSize: 14,
    color: "#111827",
  },
  roomsBar: {
    backgroundColor: "#fff",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#d1d5db",
  },
  roomsContent: { paddingHorizontal: 10, paddingVertical: 8, gap: 7 },
  roomButton: {
    height: 32,
    paddingHorizontal: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: "#f8fafc",
  },
  roomButtonActive: { backgroundColor: "#2563eb", borderColor: "#2563eb" },
  roomText: { fontSize: 12, fontWeight: "700", color: "#475569" },
  roomTextActive: { color: "#fff" },
  list: { flex: 1 },
  listContent: { paddingHorizontal: 12, paddingVertical: 12 },
  listEmpty: { flexGrow: 1, justifyContent: "center" },
  empty: { alignItems: "center", paddingHorizontal: 28 },
  emptyTitle: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: "800",
    color: "#374151",
    textAlign: "center",
  },
  emptyText: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
    color: "#6b7280",
    textAlign: "center",
  },
  messageRow: { alignItems: "flex-start", marginBottom: 8 },
  messageRowMine: { alignItems: "flex-end" },
  bubble: {
    maxWidth: "86%",
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#fff",
  },
  bubbleMine: { backgroundColor: "#dbeafe", borderColor: "#bfdbfe" },
  messageHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 4,
  },
  username: {
    flexShrink: 1,
    fontSize: 12,
    fontWeight: "800",
    color: "#2563eb",
  },
  time: { fontSize: 10, color: "#6b7280" },
  messageText: { fontSize: 15, lineHeight: 20, color: "#111827" },
  messageTextAfterImage: { marginTop: 7 },
  messageImagesPanel: {
    width: 220,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
  },
  messageImageSingle: {
    width: 220,
    height: 220,
    backgroundColor: "#e5e7eb",
  },
  messageImage: { width: 108, height: 108, backgroundColor: "#e5e7eb" },
  imagePreviewPanel: {
    minHeight: 88,
    paddingVertical: 8,
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#d1d5db",
  },
  imagePreviewContent: {
    paddingHorizontal: 10,
    paddingRight: 4,
    gap: 9,
  },
  imagePreviewItem: {
    width: 72,
    height: 72,
  },
  imagePreview: { width: 72, height: 72, backgroundColor: "#e5e7eb" },
  removeImageButton: {
    position: "absolute",
    top: -5,
    right: -5,
    width: 23,
    height: 23,
    borderRadius: 12,
    backgroundColor: "#ef4444",
    alignItems: "center",
    justifyContent: "center",
  },
  imagesCounter: {
    paddingHorizontal: 10,
    fontSize: 11,
    color: "#6b7280",
  },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingHorizontal: 10,
    paddingTop: 9,
    paddingBottom: 5,
    backgroundColor: "#fff",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#d1d5db",
  },
  imageButton: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  messageInput: {
    flex: 1,
    minHeight: 42,
    maxHeight: 120,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 10,
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "#fff",
    fontSize: 15,
    color: "#111827",
  },
  sendButton: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2563eb",
  },
  sendButtonDisabled: { backgroundColor: "#9ca3af" },
  sendButtonPressed: { opacity: 0.8 },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingBottom: 8,
    backgroundColor: "#fff",
  },
  counter: { fontSize: 10, color: "#9ca3af" },
  footerText: { fontSize: 10, color: "#9ca3af" },
});
