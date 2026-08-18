// src/screens/ChatScreen.js
import React, { useCallback, useMemo, useRef, useState } from "react";
import { FlatList, KeyboardAvoidingView, Platform, Pressable, SafeAreaView, StyleSheet, View } from "react-native";
import { I18nText as Text, I18nTextInput as TextInput, useI18n } from "@/src/i18n";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

const ROOM = "compras";
const MAX_MESSAGE_LENGTH = 280;

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
  return Platform.OS === "ios" ? "iPhone" : Platform.OS === "android" ? "Android" : "anonymous";
}

function saveAlias(alias) {
  if (Platform.OS !== "web" || typeof window === "undefined") return;
  try { window.localStorage?.setItem("shopp-chat-alias", alias); } catch {}
}

function formatTime(timestamp, language = "es") {
  if (!timestamp) return "";
  try {
    return new Date(timestamp).toLocaleTimeString(language === "en" ? "en-GB" : "es-ES", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function Message({ item, myAlias, language }) {
  const mine = item.username === myAlias;
  const timestamp = item.createdAt || item._creationTime;
  return (
    <View style={[styles.messageRow, mine && styles.messageRowMine]}>
      <View style={[styles.bubble, mine && styles.bubbleMine]}>
        <View style={styles.messageHeader}>
          <Text style={styles.username} numberOfLines={1}>{item.username || "anonymous"}</Text>
          <Text style={styles.time}>{formatTime(timestamp, language)}</Text>
        </View>
        <Text style={styles.messageText}>{item.text}</Text>
      </View>
    </View>
  );
}

export default function ChatScreen() {
  const listRef = useRef(null);
  const { language } = useI18n();
  const [alias, setAlias] = useState(createDefaultAlias);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  const messages = useQuery(api.chat.listMessages, { room: ROOM });
  const sendMessage = useMutation(api.chat.sendMessage);

  const visibleMessages = useMemo(() => {
    if (!Array.isArray(messages)) return [];
    return [...messages].sort((a, b) => (a.createdAt || a._creationTime || 0) - (b.createdAt || b._creationTime || 0));
  }, [messages]);

  const cleanAlias = alias.trim() || "anonymous";
  const cleanInput = input.trim();
  const canSend = Boolean(cleanInput) && cleanInput.length <= MAX_MESSAGE_LENGTH && !sending;

  const handleAliasChange = useCallback((value) => {
    const next = value.slice(0, 40);
    setAlias(next);
    saveAlias(next);
  }, []);

  const handleSend = useCallback(async () => {
    if (!canSend) return;
    setSending(true);
    try {
      await sendMessage({ room: ROOM, username: cleanAlias, text: cleanInput });
      setInput("");
      if (typeof requestAnimationFrame === "function") {
        requestAnimationFrame(() => listRef.current?.scrollToEnd?.({ animated: true }));
      }
    } catch (error) {
      console.error("[Chat] No se pudo enviar el mensaje:", error);
    } finally {
      setSending(false);
    }
  }, [canSend, cleanAlias, cleanInput, sendMessage]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <View style={styles.iconBox}><Ionicons name="chatbubbles-outline" size={21} color="#2563eb" /></View>
            <View style={styles.titleBlock}>
              <Text style={styles.title}>Chat de compras</Text>
              <Text style={styles.subtitle}>
                {language === "en" ? `Open room · #${ROOM}` : `Sala abierta · #${ROOM}`}
              </Text>
            </View>
          </View>
          <View style={styles.aliasRow}>
            <Text style={styles.aliasLabel}>Alias</Text>
            <TextInput value={alias} onChangeText={handleAliasChange} placeholder="Tu alias" placeholderTextColor="#9ca3af" style={styles.aliasInput} maxLength={40} autoCorrect={false} autoCapitalize="none" />
          </View>
        </View>

        <FlatList
          ref={listRef}
          data={visibleMessages}
          keyExtractor={(item) => String(item._id || item.id)}
          renderItem={({ item }) => <Message item={item} myAlias={cleanAlias} language={language} />}
          style={styles.list}
          contentContainerStyle={[styles.listContent, visibleMessages.length === 0 && styles.listEmpty]}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => listRef.current?.scrollToEnd?.({ animated: false })}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="chatbubble-ellipses-outline" size={34} color="#94a3b8" />
              <Text style={styles.emptyTitle}>{messages === undefined ? "Conectando con Convex…" : "Todavía no hay mensajes"}</Text>
              <Text style={styles.emptyText}>Abre Shopp en otro dispositivo y usa un alias diferente para probar la conversación en tiempo real.</Text>
            </View>
          }
        />

        <View style={styles.composer}>
          <TextInput value={input} onChangeText={(value) => setInput(value.slice(0, MAX_MESSAGE_LENGTH))} placeholder="Escribe un mensaje…" placeholderTextColor="#9ca3af" style={styles.messageInput} multiline maxLength={MAX_MESSAGE_LENGTH} />
          <Pressable onPress={handleSend} disabled={!canSend} style={({ pressed }) => [styles.sendButton, !canSend && styles.sendButtonDisabled, pressed && canSend && styles.sendButtonPressed]}>
            <Ionicons name="send" size={18} color="#ffffff" />
          </Pressable>
        </View>

        <View style={styles.footer}>
          <Text style={styles.counter}>{input.length}/{MAX_MESSAGE_LENGTH}</Text>
          <Text style={styles.footerText}>Pruebas abiertas · sin login obligatorio</Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea:{flex:1,backgroundColor:"#fff"}, screen:{flex:1,backgroundColor:"#f3f4f6"},
  header:{paddingHorizontal:14,paddingTop:10,paddingBottom:12,backgroundColor:"#fff",borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:"#d1d5db"},
  titleRow:{flexDirection:"row",alignItems:"center"}, iconBox:{width:38,height:38,borderRadius:12,alignItems:"center",justifyContent:"center",backgroundColor:"#eff6ff",marginRight:10},
  titleBlock:{flex:1}, title:{fontSize:19,fontWeight:"800",color:"#111827"}, subtitle:{marginTop:2,fontSize:12,color:"#6b7280"},
  aliasRow:{marginTop:10,flexDirection:"row",alignItems:"center",gap:8}, aliasLabel:{fontSize:13,fontWeight:"700",color:"#4b5563"},
  aliasInput:{flex:1,minHeight:38,paddingHorizontal:10,borderWidth:1,borderColor:"#d1d5db",backgroundColor:"#fff",fontSize:14,color:"#111827"},
  list:{flex:1}, listContent:{paddingHorizontal:12,paddingVertical:12}, listEmpty:{flexGrow:1,justifyContent:"center"},
  empty:{alignItems:"center",paddingHorizontal:28}, emptyTitle:{marginTop:10,fontSize:16,fontWeight:"800",color:"#374151",textAlign:"center"}, emptyText:{marginTop:6,fontSize:13,lineHeight:19,color:"#6b7280",textAlign:"center"},
  messageRow:{alignItems:"flex-start",marginBottom:8}, messageRowMine:{alignItems:"flex-end"}, bubble:{maxWidth:"86%",paddingHorizontal:11,paddingVertical:8,borderWidth:1,borderColor:"#e5e7eb",backgroundColor:"#fff"}, bubbleMine:{backgroundColor:"#dbeafe",borderColor:"#bfdbfe"},
  messageHeader:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",gap:12,marginBottom:4}, username:{flexShrink:1,fontSize:12,fontWeight:"800",color:"#2563eb"}, time:{fontSize:10,color:"#6b7280"}, messageText:{fontSize:15,lineHeight:20,color:"#111827"},
  composer:{flexDirection:"row",alignItems:"flex-end",gap:8,paddingHorizontal:10,paddingTop:9,paddingBottom:5,backgroundColor:"#fff",borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:"#d1d5db"},
  messageInput:{flex:1,minHeight:42,maxHeight:120,paddingHorizontal:12,paddingTop:10,paddingBottom:10,borderWidth:1,borderColor:"#d1d5db",backgroundColor:"#fff",fontSize:15,color:"#111827"},
  sendButton:{width:42,height:42,alignItems:"center",justifyContent:"center",backgroundColor:"#2563eb"}, sendButtonDisabled:{backgroundColor:"#9ca3af"}, sendButtonPressed:{opacity:.8},
  footer:{flexDirection:"row",justifyContent:"space-between",paddingHorizontal:12,paddingBottom:8,backgroundColor:"#fff"}, counter:{fontSize:10,color:"#9ca3af"}, footerText:{fontSize:10,color:"#9ca3af"}
});
