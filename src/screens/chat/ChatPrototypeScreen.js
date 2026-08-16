import React, { useMemo, useRef, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const ROOMS = [
  { id: "centro-comercial", label: "Centro comercial" },
  { id: "supermercado", label: "Supermercado" },
  { id: "tienda", label: "Tienda" },
];

const INITIAL_MESSAGES = [
  {
    id: "m1",
    alias: "María",
    text: "El detergente Ariel tiene 2ª unidad -70%.",
    createdAt: Date.now() - 1000 * 60 * 8,
    mine: false,
  },
  {
    id: "m2",
    alias: "Carlos",
    text: "¿Alguien sabe dónde están las cápsulas de café?",
    createdAt: Date.now() - 1000 * 60 * 5,
    mine: false,
  },
  {
    id: "m3",
    alias: "Ana",
    text: "Pasillo 12, al fondo.",
    createdAt: Date.now() - 1000 * 60 * 3,
    mine: false,
  },
];

function formatTime(timestamp) {
  return new Intl.DateTimeFormat("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

function RoomSelector({ value, onChange }) {
  return (
    <View style={styles.roomSelector}>
      {ROOMS.map((room) => {
        const active = room.id === value;
        return (
          <Pressable
            key={room.id}
            onPress={() => onChange(room.id)}
            style={[styles.roomButton, active && styles.roomButtonActive]}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
          >
            <Text
              style={[
                styles.roomButtonText,
                active && styles.roomButtonTextActive,
              ]}
              numberOfLines={1}
            >
              {room.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function MessageBubble({ item }) {
  return (
    <View
      style={[
        styles.messageRow,
        item.mine ? styles.messageRowMine : styles.messageRowOther,
      ]}
    >
      <View
        style={[
          styles.messageBubble,
          item.mine ? styles.messageBubbleMine : styles.messageBubbleOther,
        ]}
      >
        {!item.mine ? <Text style={styles.alias}>{item.alias}</Text> : null}

        <Text style={styles.messageText}>{item.text}</Text>

        <Text style={styles.messageTime}>{formatTime(item.createdAt)}</Text>
      </View>
    </View>
  );
}

export default function ChatPrototypeScreen() {
  const listRef = useRef(null);

  const [roomId, setRoomId] = useState("centro-comercial");
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [text, setText] = useState("");

  const currentRoom = useMemo(
    () => ROOMS.find((room) => room.id === roomId),
    [roomId]
  );

  const sendMessage = () => {
    const value = text.trim();
    if (!value) return;

    const nextMessage = {
      id: `local-${Date.now()}`,
      alias: "Tú",
      text: value,
      createdAt: Date.now(),
      mine: true,
    };

    setMessages((current) => [...current, nextMessage]);
    setText("");

    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd?.({ animated: true });
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
      >
        <View style={styles.header}>
          <View style={styles.headerTitleRow}>
            <View style={styles.placeIcon}>
              <Ionicons name="storefront-outline" size={20} color="#111827" />
            </View>

            <View style={styles.headerText}>
              <Text style={styles.title}>Chat de compras</Text>
              <Text style={styles.subtitle}>
                {currentRoom?.label ?? "Sala"} · mensajes temporales
              </Text>
            </View>
          </View>

          <RoomSelector value={roomId} onChange={setRoomId} />
        </View>

        <FlatList
          ref={listRef}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <MessageBubble item={item} />}
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
                Comparte precios, ofertas, disponibilidad o dónde encontrar un
                producto. Los vídeos de YouTube se gestionarán en otra pantalla.
              </Text>
            </View>
          }
        />

        <View style={styles.composer}>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder="Escribe un mensaje…"
            placeholderTextColor="#9CA3AF"
            multiline
            maxLength={500}
            returnKeyType="send"
            blurOnSubmit={false}
            onSubmitEditing={sendMessage}
            accessibilityLabel="Mensaje"
          />

          <Pressable
            onPress={sendMessage}
            disabled={!text.trim()}
            style={({ pressed }) => [
              styles.sendButton,
              !text.trim() && styles.sendButtonDisabled,
              pressed && text.trim() && styles.sendButtonPressed,
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
    backgroundColor: "#F4F5F7",
  },
  header: {
    backgroundColor: "#FFFFFF",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#D1D5DB",
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 10,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  placeIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
    marginRight: 10,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    lineHeight: 22,
    fontWeight: "700",
    color: "#111827",
  },
  subtitle: {
    marginTop: 2,
    fontSize: 12,
    color: "#6B7280",
  },
  roomSelector: {
    flexDirection: "row",
    gap: 6,
  },
  roomButton: {
    flex: 1,
    minHeight: 34,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "#FFFFFF",
  },
  roomButtonActive: {
    backgroundColor: "#111827",
    borderColor: "#111827",
  },
  roomButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4B5563",
  },
  roomButtonTextActive: {
    color: "#FFFFFF",
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 16,
  },
  notice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  noticeText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: "#4B5563",
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
    maxWidth: "82%",
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 6,
    borderWidth: 1,
  },
  messageBubbleMine: {
    backgroundColor: "#DCFCE7",
    borderColor: "#BBF7D0",
  },
  messageBubbleOther: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E5E7EB",
  },
  alias: {
    marginBottom: 3,
    fontSize: 12,
    fontWeight: "700",
    color: "#2563EB",
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
    color: "#111827",
  },
  messageTime: {
    marginTop: 4,
    alignSelf: "flex-end",
    fontSize: 10,
    color: "#6B7280",
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
  input: {
    flex: 1,
    minHeight: 42,
    maxHeight: 110,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingTop: Platform.OS === "ios" ? 10 : 8,
    paddingBottom: Platform.OS === "ios" ? 10 : 8,
    fontSize: 15,
    color: "#111827",
  },
  sendButton: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2563EB",
  },
  sendButtonDisabled: {
    opacity: 0.35,
  },
  sendButtonPressed: {
    opacity: 0.8,
  },
});
