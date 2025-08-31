// App.js
import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  View, Text, SafeAreaView, StatusBar, StyleSheet, TouchableOpacity, TextInput,
  KeyboardAvoidingView, Platform, Dimensions, ActivityIndicator, ScrollView,
  RefreshControl, FlatList, Switch
} from "react-native";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { Magnetometer } from "expo-sensors";
import { CalculationMethod, PrayerTimes, Coordinates, Madhab } from "adhan";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// ---- Theme & palette ----
const COLORS = {
  greenDark: "#254A22",
  green: "#2E5B27",
  greenLight: "#E9F2EA",
  text: "#0F172A",
  subText: "#475569",
  white: "#FFFFFF",
  card: "#F8FAFC",
  border: "#E2E8F0",
};

// ---- Global utils ----
const KAABA = { lat: 21.4225, lng: 39.8262 };
const deg2rad = (d) => (d * Math.PI) / 180;
const rad2deg = (r) => (r * 180) / Math.PI;
function bearingToKaaba(lat, lon) {
  const φ1 = deg2rad(lat), φ2 = deg2rad(KAABA.lat), Δλ = deg2rad(KAABA.lng - lon);
  const y = Math.sin(Δλ), x = Math.cos(φ1) * Math.tan(φ2) - Math.sin(φ1) * Math.cos(Δλ);
  return (rad2deg(Math.atan2(y, x)) + 360) % 360;
}
const pad = (n) => (n < 10 ? `0${n}` : `${n}`);
const todayIso = () => {
  const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

// ======================= Chat =======================
function ChatScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.white }}>
      <StatusBar barStyle="light-content" />
      <View style={styles.appBar}>
        <View style={styles.appBarLeft}>
          <MaterialCommunityIcons name="robot-excited" size={24} color="#F0C419" />
          <Text style={styles.appBarTitle}>Hidayah</Text>
        </View>
      </View>

      <View style={styles.greetingWrap}>
        <View style={styles.greetingIcon}>
          <MaterialCommunityIcons name="robot-excited" size={26} color={COLORS.white} />
        </View>
        <Text style={styles.greetingText}>
          السلام عليكم! I'm your Islamic assistant.{"\n"}How can I help you today?
        </Text>
      </View>

      <View style={{ paddingHorizontal: 20, marginTop: 6 }}>
        <Text style={styles.sectionTitle}>Quick Questions:</Text>
        <ActionButton icon={<Ionicons name="md-prayer" size={22} color={COLORS.green} />} label="Daily Du'a recommendations" />
        <ActionButton icon={<Ionicons name="book-outline" size={22} color={COLORS.green} />} label="Explain a Hadith" />
        <ActionButton icon={<Ionicons name="moon" size={22} color={COLORS.green} />} label="Tell me a story of the Prophet (pbuh)" />
      </View>

      <View style={{ flex: 1 }} />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.inputBar}>
          <TextInput placeholder="Ask about Islam..." placeholderTextColor={COLORS.subText} style={styles.input} />
          <TouchableOpacity style={styles.micBtn}><Ionicons name="mic" size={20} color={COLORS.white} /></TouchableOpacity>
          <TouchableOpacity style={styles.sendBtn}><Ionicons name="send" size={18} color={COLORS.white} /></TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ======================= Qibla =======================
function QiblaScreen() {
  const [heading, setHeading] = useState(0);
  const [qibla, setQibla] = useState(null);
  const [err, setErr] = useState(null);
  const size = Math.min(Dimensions.get("window").width * 0.8, 320);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") { setErr("Location permission denied"); return; }
      const loc = await Location.getCurrentPositionAsync({});
      setQibla(bearingToKaaba(loc.coords.latitude, loc.coords.longitude));
    })();

    let sub;
    const onOrientation = (e) => setHeading(((e.alpha ?? 0) + 360) % 360);
    try {
      if (Platform.OS === "web" && typeof window !== "undefined") {
        window.addEventListener("deviceorientation", onOrientation, true);
      } else {
        Magnetometer.setUpdateInterval(400);
        sub = Magnetometer.addListener((d) => {
          const deg = ((Math.atan2(d.y, d.x) * 180) / Math.PI + 360) % 360;
          setHeading(deg);
        });
      }
    } catch (e) { console.warn("Compass not available:", e); }

    return () => {
      sub?.remove?.();
      if (Platform.OS === "web" && typeof window !== "undefined") {
        window.removeEventListener("deviceorientation", onOrientation, true);
      }
    };
  }, []);

  const needleAngle = qibla == null ? 0 : (qibla - heading + 360) % 360;

  return (
    <SafeAreaView style={styles.phWrap}>
      <Text style={styles.phTitle}>Qibla</Text>
      {err && <Text style={{ color: "red", marginTop: 8 }}>{err}</Text>}
      <View style={[styles.compass, { width: size, height: size, borderRadius: size / 2 }]}>
        <Text style={[styles.cardinal, { top: 8 }]}>N</Text>
        <Text style={[styles.cardinal, { right: 8 }]}>E</Text>
        <Text style={[styles.cardinal, { bottom: 8 }]}>S</Text>
        <Text style={[styles.cardinal, { left: 8 }]}>W</Text>
        <View style={[styles.needle, { transform: [{ rotate: `${needleAngle}deg` }], width: size * 0.04, height: size * 0.42, borderTopLeftRadius: size * 0.02, borderTopRightRadius: size * 0.02 }]} />
        <View style={[styles.needleTail, { transform: [{ rotate: `${needleAngle + 180}deg` }], width: size * 0.03, height: size * 0.22, borderBottomLeftRadius: size * 0.015, borderBottomRightRadius: size * 0.015 }]} />
        <View style={[styles.hub, { width: size * 0.12, height: size * 0.12, borderRadius: size * 0.06 }]}><Ionicons name="star" size={Math.round(size * 0.06)} color={COLORS.white} /></View>
      </View>
      <Text style={{ color: COLORS.subText, marginTop: 16 }}>Lay your phone flat. The red needle points toward Makkah.</Text>
    </SafeAreaView>
  );
}

// ======================= Prayer =======================
const PRAYER_ORDER = [["Fajr","fajr"],["Sunrise","sunrise"],["Dhuhr","dhuhr"],["Asr","asr"],["Maghrib","maghrib"],["Isha","isha"]];
const fmt = (d, tz) => new Intl.DateTimeFormat(undefined,{hour:"numeric",minute:"2-digit",hour12:true,timeZone:tz}).format(d);

function PrayerScreen() {
  const [loading, setLoading] = useState(true), [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null), [city, setCity] = useState(""), [tz, setTz] = useState();
  const [times, setTimes] = useState(null), [nextPrayerKey, setNextPrayerKey] = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") { setError("Location permission denied."); setLoading(false); return; }
      const pos = await Location.getCurrentPositionAsync({});
      try {
        const r = await Location.reverseGeocodeAsync(pos.coords);
        const p = r?.[0]; if (p) setCity([p.city, p.region, p.country].filter(Boolean).join(", "));
      } catch (e) { console.warn("Reverse geocode failed", e); }
      const coords = new Coordinates(pos.coords.latitude, pos.coords.longitude);
      setTz(Intl.DateTimeFormat().resolvedOptions().timeZone);
      const params = CalculationMethod.MuslimWorldLeague(); params.madhab = Madhab.Shafi;
      const pt = new PrayerTimes(coords, new Date(), params);
      setTimes({ fajr: pt.fajr, sunrise: pt.sunrise, dhuhr: pt.dhuhr, asr: pt.asr, maghrib: pt.maghrib, isha: pt.isha });
      const now = new Date(); let nextKey = null;
      for (const [,k] of PRAYER_ORDER) if (pt[k] && now < pt[k]) { nextKey = k; break; }
      setNextPrayerKey(nextKey);
    } catch (e) { setError("Failed to load prayer times."); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.white }}>
      <ScrollView contentContainerStyle={{ padding: 20 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => {setRefreshing(true); load();}} />}>
        <Text style={prStyles.title}>Prayer Times</Text>
        {!!city && <Text style={prStyles.subtitle}>{city}</Text>}
        {loading ? <View style={{ paddingTop: 30 }}><ActivityIndicator/></View> :
         error ? <Text style={{ color: "red", marginTop: 12 }}>{error}</Text> :
         <View style={{ marginTop: 16 }}>
          {PRAYER_ORDER.map(([label,key]) => (
            <View key={key} style={[prStyles.row,{borderColor:COLORS.border,backgroundColor:key===nextPrayerKey?COLORS.greenLight:COLORS.card}]}>
              <Text style={[prStyles.label,{color:COLORS.text}]}>{label}</Text>
              <Text style={[prStyles.time,{color:COLORS.text}]}>{times?.[key]?fmt(times[key],tz):"--:--"}</Text>
            </View>
          ))}
          <Text style={prStyles.hint}>Method: Muslim World League • Madhab: Shafi</Text>
        </View>}
      </ScrollView>
    </SafeAreaView>
  );
}
const prStyles = StyleSheet.create({
  title:{fontSize:22,fontWeight:"800",color:COLORS.text}, subtitle:{marginTop:4,color:COLORS.subText,fontSize:14},
  row:{borderWidth:1,borderRadius:14,paddingVertical:14,paddingHorizontal:16,marginBottom:10,flexDirection:"row",justifyContent:"space-between",alignItems:"center"},
  label:{fontSize:16,fontWeight:"700"}, time:{fontSize:16,fontWeight:"600"}, hint:{marginTop:10,color:COLORS.subText,fontSize:12}
});

// ======================= Islamic Calendar =======================
function IslamicCalendarScreen() {
  const [hMonth,setHMonth]=useState(null),[hYear,setHYear]=useState(null),[days,setDays]=useState([]),[loading,setLoading]=useState(true),[err,setErr]=useState(null);
  const isoToday=todayIso();
  const bootstrap=useCallback(async()=>{setLoading(true);setErr(null);
    try{const d=new Date();const r=await fetch(`https://api.aladhan.com/v1/gToH?date=${pad(d.getDate())}-${pad(d.getMonth()+1)}-${d.getFullYear()}`);const j=await r.json();
      const h=j?.data?.hijri; if(!h) throw new Error(); setHMonth(parseInt(h.month.number,10)); setHYear(parseInt(h.year,10));
    }catch{ setErr("Could not detect Hijri date."); setLoading(false);}},[]);
  const loadMonth=useCallback(async(y,m)=>{setLoading(true);setErr(null);
    try{const r=await fetch(`https://api.aladhan.com/v1/hijriCalendar/${y}/${m}?adjustment=0`);const j=await r.json(); if(!Array.isArray(j?.data)) throw new Error(); setDays(j.data);}
    catch{setErr("Failed to load Islamic calendar.");} finally{setLoading(false);}},[]);
  useEffect(()=>{bootstrap();},[bootstrap]);
  useEffect(()=>{if(hMonth&&hYear) loadMonth(hYear,hMonth);},[hMonth,hYear,loadMonth]);
  const headerLabel=useMemo(()=>!days.length?"":`${days[0].date.hijri.month.en} ${days[0].date.hijri.year}`,[days]);
  const weeks=useMemo(()=>{ if(!days.length) return []; const s=[...days].sort((a,b)=>a.date.gregorian.date<b.date.gregorian.date?-1:1);
    const first=new Date(s[0].date.gregorian.date).getDay(); const cells=[...Array(first)].map(()=>null).concat(s); const rows=[]; for(let i=0;i<cells.length;i+=7) rows.push(cells.slice(i,i+7)); return rows;},[days]);
  const onPrev=()=>{if(!hMonth||!hYear) return; hMonth===1?(setHMonth(12),setHYear(hYear-1)):setHMonth(hMonth-1);};
  const onNext=()=>{if(!hMonth||!hYear) return; hMonth===12?(setHMonth(1),setHYear(hYear+1)):setHMonth(hMonth+1);};

  return (
    <SafeAreaView style={{ flex:1, backgroundColor:COLORS.white }}>
      <View style={calStyles.header}>
        <Text style={calStyles.headerTitle}>Islamic Calendar</Text>
        <Text style={calStyles.headerMeta}>{headerLabel}</Text>
        <View style={calStyles.nav}>
          <TouchableOpacity onPress={onPrev} style={calStyles.navBtn}><Ionicons name="chevron-back" size={20} color={COLORS.text}/><Text style={calStyles.navText}>Prev</Text></TouchableOpacity>
          <TouchableOpacity onPress={onNext} style={calStyles.navBtn}><Text style={calStyles.navText}>Next</Text><Ionicons name="chevron-forward" size={20} color={COLORS.text}/></TouchableOpacity>
        </View>
      </View>
      <View style={calStyles.weekHeader}>{["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d)=><Text key={d} style={calStyles.weekHeadCell}>{d}</Text>)}</View>
      {loading? <View style={{paddingTop:24}}><ActivityIndicator/></View> : err? <Text style={{color:"red",padding:16}}>{err}</Text> :
        <FlatList data={weeks} keyExtractor={(_,i)=>`w${i}`} contentContainerStyle={{paddingHorizontal:12,paddingBottom:24}}
          renderItem={({item:row})=>(
            <View style={calStyles.weekRow}>
              {row.map((cell,idx)=>!cell? <View key={idx} style={[calStyles.dayCell,calStyles.blankCell]}/> :
                <View key={cell.date.gregorian.date} style={[calStyles.dayCell, cell.date.gregorian.date===isoToday && calStyles.todayCell]}>
                  <Text style={[calStyles.greg, cell.date.gregorian.date===isoToday && calStyles.todayText]}>{parseInt(cell.date.gregorian.day,10)}</Text>
                  <Text style={[calStyles.hijri, cell.date.gregorian.date===isoToday && calStyles.todayText]}>{cell.date.hijri.day}</Text>
                </View>)}
            </View>)}
        />}
      <View style={calStyles.legend}>
        <View style={[calStyles.legendDot,{backgroundColor:COLORS.card,borderColor:COLORS.border}]}/>
        <Text style={calStyles.legendText}>Gregorian • Hijri</Text>
        <View style={[calStyles.legendDot,{backgroundColor:COLORS.greenLight,borderColor:COLORS.green}]}/>
        <Text style={calStyles.legendText}>Today</Text>
      </View>
    </SafeAreaView>
  );
}
const calStyles = StyleSheet.create({
  header:{paddingHorizontal:16,paddingTop:12,paddingBottom:8,backgroundColor:COLORS.white},
  headerTitle:{fontSize:20,fontWeight:"800",color:COLORS.text}, headerMeta:{marginTop:2,color:COLORS.subText,fontSize:12},
  nav:{marginTop:10,flexDirection:"row",justifyContent:"space-between"},
  navBtn:{flexDirection:"row",alignItems:"center",gap:4,backgroundColor:COLORS.card,borderWidth:1,borderColor:COLORS.border,paddingHorizontal:12,paddingVertical:8,borderRadius:10},
  navText:{color:COLORS.text,fontWeight:"700"},
  weekHeader:{flexDirection:"row",paddingHorizontal:12,marginTop:8},
  weekHeadCell:{flex:1,textAlign:"center",fontWeight:"700",color:COLORS.subText},
  weekRow:{flexDirection:"row",marginTop:8},
  dayCell:{flex:1,marginHorizontal:4,aspectRatio:1,backgroundColor:COLORS.card,borderWidth:1,borderColor:COLORS.border,borderRadius:12,padding:6,justifyContent:"space-between"},
  blankCell:{backgroundColor:"transparent",borderColor:"transparent"},
  greg:{fontSize:14,fontWeight:"800",color:COLORS.text}, hijri:{fontSize:12,fontWeight:"700",color:COLORS.subText,textAlign:"right"},
  todayCell:{backgroundColor:COLORS.greenLight,borderColor:COLORS.green}, todayText:{color:COLORS.greenDark},
  legend:{flexDirection:"row",alignItems:"center",gap:8,paddingHorizontal:16,paddingVertical:8}, legendDot:{width:16,height:16,borderRadius:8,borderWidth:1}, legendText:{color:COLORS.subText},
});

// ======================= Profile stack pages =======================
const MOSQUES = [
  { name: "Masjid Al-Noor", distance: "0.3 mi", address: "123 Main Street, New York", next: "Next: Maghrib 6:45 PM" },
  { name: "Islamic Center", distance: "0.7 mi", address: "456 Oak Avenue, New York", next: "Next: Maghrib 6:45 PM" },
];
const DUAS = [
  { title: "Morning Duas", ar: "بِسْمِ اللهِ الرَّحْمٰنِ الرَّحِيْمِ", en: "In the name of Allah, the Most Gracious..." },
  { title: "Evening Duas", ar: "اللّٰهُمَّ أَعِنِّي عَلَى ذِكْرِكَ", en: "O Allah, help me to remember You..." },
  { title: "Before Sleep", ar: "اللّٰهُمَّ بِاسْمِكَ أَمُوتُ وَأَحْيَا", en: "O Allah, in Your Name I die and I live" },
];

function MosquesScreen() {
  return (
    <SafeAreaView style={{ flex:1, backgroundColor:COLORS.white }}>
      <ScrollView contentContainerStyle={{ padding:12 }}>
        {MOSQUES.map((m)=>(
          <View key={m.name} style={pf.mosqueCard}>
            <View style={{ flexDirection:"row", alignItems:"center" }}>
              <MaterialCommunityIcons name="mosque" size={18} color={COLORS.green} />
              <Text style={[pf.mosqueName,{marginLeft:6}]}>{m.name}</Text>
            </View>
            <Text style={pf.mosqueDist}>{m.distance}</Text>
            <Text style={pf.mosqueAddr}>{m.address}</Text>
            <View style={pf.mosqueFoot}>
              <View style={{ flexDirection:"row", alignItems:"center" }}>
                <Ionicons name="time-outline" size={14} color={COLORS.subText} />
                <Text style={pf.mosqueNext}>  {m.next}</Text>
              </View>
              <TouchableOpacity style={pf.directionsBtn}>
                <Ionicons name="navigate-outline" size={14} color="#fff" />
                <Text style={pf.directionsTxt}>Directions</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
function AudioBooksScreen(){return <SimpleList title="Audio Books" items={["Seerah audio","Stories of Prophets","Tajweed basics"]}/>;}
function StoriesScreen(){return <SimpleList title="Stories" items={["Story of Musa (AS)","Story of Ibrahim (AS)","Ashab al-Kahf"]}/>;}
function Names99Screen(){return <SimpleList title="99 Names of Allah" items={["Ar-Rahman","Ar-Rahim","Al-Malik","Al-Quddus","As-Salam"]}/>;}
function DuasScreen(){return (
  <SafeAreaView style={{flex:1,backgroundColor:COLORS.white}}>
    <ScrollView contentContainerStyle={{padding:12}}>
      {DUAS.map((d)=>(
        <View key={d.title} style={pf.duaCard}>
          <View style={{flex:1}}>
            <Text style={pf.duaTitle}>{d.title}</Text>
            <Text style={pf.duaArabic}>{d.ar}</Text>
            <Text style={pf.duaEn}>{d.en}</Text>
          </View>
          <TouchableOpacity style={pf.duaPlay}><Ionicons name="play" size={16} color="#fff"/></TouchableOpacity>
        </View>
      ))}
    </ScrollView>
  </SafeAreaView>
);}

function SimpleList({ title, items }) {
  return (
    <SafeAreaView style={{ flex:1, backgroundColor:COLORS.white }}>
      <ScrollView contentContainerStyle={{ padding:12 }}>
        <Text style={{ fontSize:22, fontWeight:"900", color:COLORS.text, marginBottom:12 }}>{title}</Text>
        {items.map((t)=>(
          <View key={t} style={{ backgroundColor:COLORS.card,borderWidth:1,borderColor:COLORS.border,borderRadius:12,padding:14,marginBottom:10 }}>
            <Text style={{ color:COLORS.text, fontWeight:"700" }}>{t}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

// -------- Profile Home (profile card first; features; daily duas button; settings; account) --------
function Row({ icon, tint, title, subtitle, onPress, right }) {
  return (
    <TouchableOpacity style={pf.row} onPress={onPress} activeOpacity={0.7}>
      <View style={[pf.rowIcon, { backgroundColor: tint || COLORS.greenLight }]}>{icon}</View>
      <View style={{ flex: 1 }}>
        <Text style={pf.rowTitle}>{title}</Text>
        {!!subtitle && <Text style={pf.rowSub}>{subtitle}</Text>}
      </View>
      {right ?? <Ionicons name="chevron-forward" size={18} color={COLORS.subText} />}
    </TouchableOpacity>
  );
}

function ProfileHome({ navigation }) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.white }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        {/* PROFILE SUMMARY FIRST */}
        <View style={[pf.profileCard, { marginTop: 12 }]}>
          <View style={pf.avatar}><Text style={pf.avatarInitial}>S</Text></View>
          <Text style={pf.name}>Sarah Ahmed</Text>
          <Text style={pf.joined}>Joined 2 years ago</Text>
          <View style={pf.statsRow}>
            <View style={[pf.statBox,{backgroundColor:"#ECFDF5",borderColor:"#A7F3D0"}]}><Text style={pf.statNum}>127</Text><Text style={pf.statLabel}>Days{"\n"}Active</Text></View>
            <View style={[pf.statBox,{backgroundColor:"#FFFBEB",borderColor:"#FDE68A"}]}><Text style={pf.statNum}>45</Text><Text style={pf.statLabel}>Duas{"\n"}Read</Text></View>
            <View style={[pf.statBox,{backgroundColor:"#EEF2FF",borderColor:"#C7D2FE"}]}><Text style={pf.statNum}>23</Text><Text style={pf.statLabel}>Bookmarks</Text></View>
          </View>
        </View>

        {/* MOSQUES */}
        <Text style={pf.sectionHd}>Mosques Nearby</Text>
        {MOSQUES.map((m)=>(
          <TouchableOpacity key={m.name} style={pf.mosqueCard} activeOpacity={0.9} onPress={()=>navigation.navigate("Mosques")}>
            <View style={{ flexDirection:"row", alignItems:"center" }}>
              <MaterialCommunityIcons name="mosque" size={18} color={COLORS.green} />
              <Text style={[pf.mosqueName,{marginLeft:6}]}>{m.name}</Text>
            </View>
            <Text style={pf.mosqueDist}>{m.distance}</Text>
            <Text style={pf.mosqueAddr}>{m.address}</Text>
            <View style={pf.mosqueFoot}>
              <View style={{ flexDirection:"row", alignItems:"center" }}>
                <Ionicons name="time-outline" size={14} color={COLORS.subText} />
                <Text style={pf.mosqueNext}>  {m.next}</Text>
              </View>
              <TouchableOpacity style={pf.directionsBtn}><Ionicons name="navigate-outline" size={14} color="#fff" /><Text style={pf.directionsTxt}>Directions</Text></TouchableOpacity>
            </View>
          </TouchableOpacity>
        ))}

        {/* GUIDANCE & STORIES */}
        <Text style={pf.sectionHd}>Guidance & Stories</Text>
        <View style={pf.tileRow}>
          <TouchableOpacity style={[pf.tile,{backgroundColor:"#22c55e"}]} onPress={()=>navigation.navigate("AudioBooks")}>
            <Ionicons name="headset-outline" size={20} color="#fff" />
            <Text style={pf.tileTitle}>Audio Books</Text>
            <Text style={pf.tileSub}>Islamic literature & stories</Text>
            <View style={pf.tileBtn}><Text style={pf.tileBtnTxt}>Listen Now</Text></View>
          </TouchableOpacity>
          <TouchableOpacity style={[pf.tile,{backgroundColor:"#3b82f6"}]} onPress={()=>navigation.navigate("Stories")}>
            <Ionicons name="book-outline" size={20} color="#fff" />
            <Text style={pf.tileTitle}>Stories</Text>
            <Text style={pf.tileSub}>Prophet stories & guidance</Text>
            <View style={pf.tileBtn}><Text style={pf.tileBtnTxt}>Read Now</Text></View>
          </TouchableOpacity>
        </View>

        {/* 99 NAMES */}
        <Text style={pf.sectionHd}>99 Names of Allah</Text>
        <TouchableOpacity style={pf.namesCard} activeOpacity={0.9} onPress={()=>navigation.navigate("Names99")}>
          <Text style={pf.arTitle}>الرَّحْمٰن</Text>
          <Text style={pf.enTitle}>Ar-Rahman</Text>
          <Text style={pf.enSub}>The Most Gracious</Text>
          <Text style={pf.progress}>1 of 99</Text>
          <View style={pf.playerRow}>
            <View style={pf.playerBtn}><Ionicons name="play-skip-back" size={18} color={COLORS.white} /></View>
            <View style={pf.playerBtn}><Ionicons name="play" size={18} color={COLORS.white} /></View>
            <View style={pf.playerBtn}><Ionicons name="play-skip-forward" size={18} color={COLORS.white} /></View>
          </View>
        </TouchableOpacity>

        {/* DAILY DUAS (collapsed button) */}
        <Text style={pf.sectionHd}>Daily Duas</Text>
        <TouchableOpacity style={pf.duaLaunch} activeOpacity={0.9} onPress={()=>navigation.navigate("Duas")}>
          <View>
            <Text style={pf.duaLaunchTitle}>Daily Duas</Text>
            <Text style={pf.duaLaunchSub}>Tap to view & listen</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.subText} />
        </TouchableOpacity>

        {/* SETTINGS */}
        <Text style={pf.sectionHd}>Settings</Text>
        <View style={pf.card}>
          <Row icon={<Ionicons name="language-outline" size={16} color={COLORS.green} />} title="Language" subtitle="English" />
          <View style={pf.sep} />
          <Row icon={<Ionicons name="contrast-outline" size={16} color={COLORS.green} />} title="Theme"
               right={<Switch value={false} onValueChange={()=>{}} thumbColor={COLORS.green} trackColor={{false:"#e5e7eb",true:"#bbf7d0"}} />}
               subtitle="Light mode" />
          <View style={pf.sep} />
          <Row icon={<Ionicons name="location-outline" size={16} color={COLORS.green} />} title="Location" subtitle="New York, USA" />
        </View>

        {/* ACCOUNT */}
        <Text style={pf.sectionHd}>Account</Text>
        <View style={pf.card}>
          <Row icon={<Ionicons name="person-outline" size={16} color={COLORS.green} />} title="Personal Information" subtitle="Name, email, phone" />
          <View style={pf.sep} />
          <Row icon={<Ionicons name="shield-checkmark-outline" size={16} color={COLORS.green} />} title="Privacy & Security" subtitle="Password, 2FA" />
          <View style={pf.sep} />
          <Row icon={<Ionicons name="notifications-outline" size={16} color={COLORS.green} />} title="Notifications" subtitle="Prayer alerts, reminders" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// Stack wrapper for Profile tab
function ProfileStackScreen() {
  return (
    <Stack.Navigator screenOptions={{ headerTintColor: "#fff", headerStyle: { backgroundColor: COLORS.greenDark }, headerTitleStyle: { fontWeight: "800" } }}>
      <Stack.Screen name="ProfileHome" component={ProfileHome} options={{ title: "Profile", headerShown: false }} />
      <Stack.Screen name="Mosques" component={MosquesScreen} options={{ title: "Mosques Nearby" }} />
      <Stack.Screen name="AudioBooks" component={AudioBooksScreen} options={{ title: "Audio Books" }} />
      <Stack.Screen name="Stories" component={StoriesScreen} options={{ title: "Stories" }} />
      <Stack.Screen name="Names99" component={Names99Screen} options={{ title: "99 Names of Allah" }} />
      <Stack.Screen name="Duas" component={DuasScreen} options={{ title: "Daily Duas" }} />
    </Stack.Navigator>
  );
}

// ======================= App (Tabs) =======================
export default function App() {
  const theme = { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: COLORS.white } };
  return (
    <NavigationContainer theme={theme}>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarShowLabel: true,
          tabBarActiveTintColor: COLORS.greenDark,
          tabBarInactiveTintColor: COLORS.subText,
          tabBarStyle: { height: 72, paddingBottom: 12, paddingTop: 8, borderTopColor: COLORS.border, backgroundColor: COLORS.white },
          tabBarIcon: ({ color, size, focused }) => {
            const s = size + (focused ? 2 : 0);
            switch (route.name) {
              case "Chat": return <MaterialCommunityIcons name="robot-excited" size={s} color={color} />;
              case "Qibla": return <Ionicons name="compass-outline" size={s} color={color} />;
              case "Prayer": return <Ionicons name="business-outline" size={s} color={color} />;
              case "Calendar": return <Ionicons name="calendar-outline" size={s} color={color} />;
              case "Profile": return <Ionicons name="person-circle-outline" size={s} color={color} />;
              default: return null;
            }
          },
        })}
      >
        <Tab.Screen name="Chat" component={ChatScreen} />
        <Tab.Screen name="Qibla" component={QiblaScreen} />
        <Tab.Screen name="Prayer" component={PrayerScreen} />
        <Tab.Screen name="Calendar" component={IslamicCalendarScreen} />
        <Tab.Screen name="Profile" component={ProfileStackScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

// ======================= Shared atoms & styles =======================
function ActionButton({ icon, label, onPress }) {
  return (
    <TouchableOpacity style={styles.actionBtn} onPress={onPress}>
      <View style={styles.leftIcon}>{icon}</View>
      <Text style={styles.actionLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={20} color={COLORS.subText} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  appBar:{backgroundColor:COLORS.greenDark,paddingHorizontal:20,paddingTop:Platform.OS==="android"?32:0,paddingBottom:16},
  appBarLeft:{flexDirection:"row",alignItems:"center",gap:10}, appBarTitle:{color:COLORS.white,fontSize:24,fontWeight:"800"},
  greetingWrap:{margin:20,backgroundColor:COLORS.greenLight,borderRadius:14,padding:16,flexDirection:"row",gap:12},
  greetingIcon:{width:44,height:44,borderRadius:22,backgroundColor:COLORS.green,alignItems:"center",justifyContent:"center",marginTop:2},
  greetingText:{color:COLORS.text,fontSize:18,lineHeight:26,fontWeight:"600"},
  sectionTitle:{color:COLORS.text,fontSize:18,fontWeight:"700",marginBottom:12},
  actionBtn:{backgroundColor:COLORS.card,borderRadius:14,borderWidth:1,borderColor:COLORS.border,paddingVertical:16,paddingHorizontal:14,marginBottom:14,flexDirection:"row",alignItems:"center",gap:12},
  leftIcon:{width:28,alignItems:"center"}, actionLabel:{flex:1,fontSize:18,color:COLORS.text,fontWeight:"600"},
  inputBar:{flexDirection:"row",alignItems:"center",gap:8,paddingHorizontal:16,paddingVertical:10,borderTopWidth:1,borderTopColor:COLORS.border,backgroundColor:COLORS.white},
  input:{flex:1,height:48,borderRadius:12,borderWidth:1,borderColor:COLORS.border,paddingHorizontal:14,backgroundColor:COLORS.card,fontSize:16,color:COLORS.text},
  micBtn:{width:44,height:44,borderRadius:12,backgroundColor:COLORS.green,alignItems:"center",justifyContent:"center"},
  sendBtn:{width:44,height:44,borderRadius:12,backgroundColor:COLORS.greenDark,alignItems:"center",justifyContent:"center"},
  phWrap:{flex:1,alignItems:"center",justifyContent:"center",padding:24,backgroundColor:COLORS.white}, phTitle:{fontSize:22,fontWeight:"800",color:COLORS.text},
  compass:{borderWidth:2,borderColor:COLORS.border,backgroundColor:"#fff",alignItems:"center",justifyContent:"center",elevation:2},
  hub:{position:"absolute",backgroundColor:COLORS.greenDark,alignItems:"center",justifyContent:"center"},
  needle:{position:"absolute",top:"9%",backgroundColor:"#B91C1C"}, needleTail:{position:"absolute",bottom:"9%",backgroundColor:"#64748B"},
  cardinal:{position:"absolute",fontWeight:"800",color:COLORS.subText,fontSize:16},
});

// ----- Profile styles reused by stack pages -----
const pf = StyleSheet.create({
  profileCard:{backgroundColor:COLORS.white,margin:12,marginTop:14,borderRadius:16,padding:16,borderWidth:1,borderColor:COLORS.border,shadowColor:"#000",shadowOpacity:0.05,shadowRadius:6,elevation:1},
  avatar:{alignSelf:"center",width:72,height:72,borderRadius:36,backgroundColor:COLORS.greenLight,alignItems:"center",justifyContent:"center",marginTop:-36},
  avatarInitial:{color:COLORS.greenDark,fontWeight:"900",fontSize:28},
  name:{textAlign:"center",fontWeight:"800",fontSize:18,color:COLORS.text,marginTop:10},
  joined:{textAlign:"center",color:COLORS.subText,marginTop:2},
  statsRow:{flexDirection:"row",gap:10,marginTop:14},
  statBox:{flex:1,borderWidth:1,borderRadius:12,paddingVertical:12,alignItems:"center"},
  statNum:{fontSize:20,fontWeight:"900",color:COLORS.text,marginBottom:4},
  statLabel:{textAlign:"center",color:COLORS.subText,fontWeight:"700",fontSize:12},

  sectionHd:{marginHorizontal:12,marginTop:14,marginBottom:8,fontWeight:"900",color:COLORS.text},
  card:{marginHorizontal:12,backgroundColor:COLORS.white,borderWidth:1,borderColor:COLORS.border,borderRadius:14,paddingHorizontal:12,paddingVertical:4},
  sep:{height:1,backgroundColor:COLORS.border,marginHorizontal:8},
  row:{flexDirection:"row",alignItems:"center",paddingVertical:12},
  rowIcon:{width:28,height:28,borderRadius:14,alignItems:"center",justifyContent:"center",marginRight:10},
  rowTitle:{fontWeight:"800",color:COLORS.text}, rowSub:{color:COLORS.subText,fontSize:12,marginTop:2},

  mosqueCard:{marginHorizontal:12,marginBottom:10,backgroundColor:COLORS.white,borderWidth:1,borderColor:COLORS.border,borderRadius:14,padding:12},
  mosqueName:{fontWeight:"800",color:COLORS.text,fontSize:15}, mosqueDist:{position:"absolute",right:12,top:12,color:COLORS.subText,fontWeight:"700"},
  mosqueAddr:{color:COLORS.text,marginTop:8},
  mosqueFoot:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",marginTop:10},
  mosqueNext:{color:COLORS.subText,fontSize:12},
  directionsBtn:{flexDirection:"row",alignItems:"center",gap:6,backgroundColor:COLORS.green,borderRadius:10,paddingHorizontal:10,paddingVertical:8},
  directionsTxt:{color:"#fff",fontWeight:"700",fontSize:12},

  tileRow:{flexDirection:"row",gap:12,marginHorizontal:12},
  tile:{flex:1,borderRadius:16,padding:14,gap:6},
  tileTitle:{color:"#fff",fontWeight:"900",fontSize:16,marginTop:4}, tileSub:{color:"rgba(255,255,255,0.9)"},
  tileBtn:{marginTop:8,backgroundColor:"rgba(255,255,255,0.25)",paddingVertical:8,borderRadius:10,alignSelf:"flex-start",paddingHorizontal:12},
  tileBtnTxt:{color:"#fff",fontWeight:"800",fontSize:12},

  namesCard:{marginHorizontal:12,backgroundColor:"#0f5132",borderRadius:16,padding:16,marginBottom:12},
  arTitle:{color:"#F0FFF4",fontSize:28,textAlign:"center",fontWeight:"900",marginTop:4},
  enTitle:{color:"#E6F6EA",textAlign:"center",fontWeight:"900",marginTop:6},
  enSub:{color:"#CFEAD7",textAlign:"center",marginTop:2},
  progress:{color:"#CFEAD7",textAlign:"center",marginTop:8,fontSize:12},
  playerRow:{flexDirection:"row",justifyContent:"center",gap:10,marginTop:10},
  playerBtn:{width:36,height:36,borderRadius:18,backgroundColor:COLORS.green,alignItems:"center",justifyContent:"center"},

  duaCard:{marginHorizontal:12,marginBottom:10,backgroundColor:COLORS.white,borderWidth:1,borderColor:COLORS.border,borderRadius:14,padding:12,flexDirection:"row",gap:10,alignItems:"center"},
  duaTitle:{fontWeight:"800",color:COLORS.text,marginBottom:6},
  duaArabic:{textAlign:"right",writingDirection:"rtl",color:COLORS.text,fontSize:16},
  duaEn:{color:COLORS.subText,marginTop:6},
  duaPlay:{width:36,height:36,borderRadius:18,backgroundColor:COLORS.green,alignItems:"center",justifyContent:"center"},

  // "Daily Duas" launcher card
  duaLaunch:{marginHorizontal:12,marginBottom:10,backgroundColor:COLORS.white,borderWidth:1,borderColor:COLORS.border,borderRadius:14,padding:14,flexDirection:"row",alignItems:"center",justifyContent:"space-between"},
  duaLaunchTitle:{fontWeight:"900",color:COLORS.text,fontSize:16},
  duaLaunchSub:{color:COLORS.subText,marginTop:2,fontSize:12},
});
