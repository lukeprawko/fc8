/**
 * CYBERFC 28 — PlayerCard & PlayStyle Models
 */

export type PlayerRole = 'GK' | 'DEF' | 'MID' | 'FWD';
export type CardRarity = 'BRONZE' | 'SILVER' | 'GOLD' | 'SPECIAL' | 'ICON';

export interface PlayStyleDefinition {
  name: string;
  icon: string;
  color: string;
  desc: string;
}

export interface PlayerCard {
  id: string;
  name: string;
  role: PlayerRole;
  ovr: number;
  playstyle?: string | null;
  playstyles?: string[];
  skin?: string;
  hair?: string;
  pac: number;
  sho: number;
  pas: number;
  dri: number;
  def: number;
  phy: number;
  div?: number;
  han?: number;
  kic?: number;
  ref?: number;
  spe?: number;
  pos?: number;
  rarity?: CardRarity;
  nation?: string;
  countryName?: string;
  image?: string;
}

export const PLAYSTYLES: Record<string, PlayStyleDefinition> = {
  intercept_wall: {
    name: 'MUR OBRONY+',
    icon: '🧱',
    color: '#00f0ff',
    desc: 'Błyskawiczne odbiory, wydłużony zasięg wślizgu i bezbłędne przecinanie toru lotu piłki.'
  },
  incisive_pass: {
    name: 'PROSTOPADŁE PODANIE+',
    icon: '🎯',
    color: '#f5b041',
    desc: 'Podania otwierające drogę do bramki są o 25% szybsze i perfekcyjnie wymierzone w tempo.'
  },
  long_ball: {
    name: 'DŁUGIE PODANIE+',
    icon: '🛰️',
    color: '#6c5ce7',
    desc: 'Celniejsze przerzuty i precyzyjne długie podania za linię obrony.'
  },
  tiki_taka: {
    name: 'TIKI-TAKA+',
    icon: '🔺',
    color: '#74b9ff',
    desc: 'Szybsze, dokładniejsze krótkie podania i perfekcyjna gra na jeden kontakt.'
  },
  quick_step: {
    name: 'SZYBKI KROK+',
    icon: '⚡',
    color: '#ffd700',
    desc: 'Eksplozywne przyspieszenie w pierwszych krokach po starcie sprintu oraz natychmiastowe odejście po zwodzie.'
  },
  rapid_step: {
    name: 'SZYBKI SPRINT+',
    icon: '⚡',
    color: '#ffd700',
    desc: 'Maksymalna prędkość sprintu z piłką i złote smugi oszałamiające rywali.'
  },
  technical_dribble: {
    name: 'KONTROLA PIŁKI+',
    icon: '🪄',
    color: '#fd79a8',
    desc: 'Piłka przyklejona do stopy, ciaśniejszy promień skrętu i pełna kontrola pod pressingiem.'
  },
  first_touch: {
    name: 'PIERWSZE PRZYJĘCIE+',
    icon: '🧲',
    color: '#55e6c1',
    desc: 'Idealne przyjęcie piłki bez utraty prędkości biegu; natychmiastowa gotowość do strzału lub podania.'
  },
  trickster: {
    name: 'TRICKSTER+',
    icon: '✨',
    color: '#e040fb',
    desc: 'Błyskawiczne zwody 360°, tęcze i elastico z gwiezdną smugą mylącą obrońców.'
  },
  power_shot: {
    name: 'POTĘŻNY STRZAŁ+',
    icon: '🚀',
    color: '#ff0055',
    desc: 'Pocisk armatni o prędkości do 140 km/h z ognistą smugą i potężnym wstrząsem bramki.'
  },
  finesse_shot: {
    name: 'STRZAŁ ROGALIK+',
    icon: '💫',
    color: '#ffb300',
    desc: 'Techniczne uderzenie ze skręcającą rotacją i podwyższoną precyzją w narożniki bramki.'
  },
  trivela: {
    name: 'TRIVELA+',
    icon: '🎯',
    color: '#ff7675',
    desc: 'Podkręcone uderzenie lub podanie zewnętrzną częścią stopy o nieprzewidywalnej rotacji.'
  },
  bruiser: {
    name: 'TWARDY ZAWODNIK+',
    icon: '💪',
    color: '#e17055',
    desc: 'Zwiększona siła fizyczna przy bark w bark i nieustępliwość w pojedynkach powietrznych.'
  },
  aerial_threat: {
    name: 'WŁADCA POWIETRZA+',
    icon: '🦅',
    color: '#a29bfe',
    desc: 'Wyższy wyskok, potężniejsze strzały głową i dominacja przy rzutach rożnych.'
  },
  relentless: {
    name: 'NIEZMĘCZONY+',
    icon: '🫀',
    color: '#00cec9',
    desc: 'Minimalne zużycie staminy podczas meczu i błyskawiczna regeneracja sił w przerwach.'
  },
  dead_ball: {
    name: 'STAŁE FRAGMENTY+',
    icon: '⚽',
    color: '#e84393',
    desc: 'Zabójcza precyzja i podgląd optymalnej trajektorii przy rzutach wolnych, karnych i rożnych.'
  },
  press_proven: {
    name: 'ODPORNY NA PRESSING+',
    icon: '🛡️',
    color: '#0984e3',
    desc: 'Niemożliwy do przepchnięcia przy osłonie piłki ciałem nawet przeciwko dwóm rywalom.'
  },
  gk_cat: {
    name: 'KOCIE REFLEKSY+',
    icon: '🐱',
    color: '#fab1a0',
    desc: 'Parady na linii bramkowej w ułamku sekundy przeciwko uderzeniom z najbliższej odległości.'
  },
  gk_cross_claimer: {
    name: 'WŁADCA PRZEDPOLA+',
    icon: '🧤',
    color: '#ffeaa7',
    desc: 'Pewne wyjścia do dośrodkowań i przechwytywanie górnych piłek ponad głowami napastników.'
  },
  gk_sweeper: {
    name: 'BRAMKARZ-LIBERO+',
    icon: '🧹',
    color: '#55efc4',
    desc: 'Agresywne i precyzyjne wybiegi poza pole karne do piłek prostopadłych rywala.'
  },
  block: {
    name: 'BLOK+',
    icon: '🛡️',
    color: '#b2bec3',
    desc: 'Większy zasięg automatycznego blokowania strzałów i przecinania uderzeń na bramkę.'
  },
  jockey: {
    name: 'PŁYNNE KRYCIE+',
    icon: '🛡️',
    color: '#81ecec',
    desc: 'Zwinne poruszanie się w pozycji bocznej; natychmiastowa reakcja na zwody napastnika.'
  }
};
