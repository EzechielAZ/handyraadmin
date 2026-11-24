/**
 * Résolveur d'icônes par nom.
 * Évite les imports nommés partout où les constants renvoient `icon: 'Name'`.
 *
 * Usage :
 *   <Icon name="Bug" size={14} strokeWidth={1.75} />
 */

import {
  // Feature status
  Circle, PenTool, Code2, Eye, FlaskConical, Zap, Archive,
  // Feature priority / complexity
  Flame, ArrowUp, Minus, ArrowDown, Sparkles,
  // Issue type / severity / status
  Bug, CheckSquare, AlertOctagon, ShieldAlert, Gauge,
  MessageCircle, FileText, CircleDot, Filter, Play,
  Check, CheckCheck, XCircle, Copy, RotateCcw, Clock,
  AlertTriangle, AlertCircle, Info,
  // Release
  ArrowUpCircle, Wrench, Calendar, CheckCircle2, Rocket,
  Plus, RefreshCw, Trash2, Layers,
  // Page / ADR / Runbook / Activity
  PenLine, MessageSquare, ArrowRight, Database, ArrowRightLeft,
  Shield, Activity, Phone, Boxes, Link, Target, ListChecks,
  FileSignature, BookOpen, Book, Tag, List,
  // Visibility
  Globe, Lock,
  // Modules
  KeyRound, Bell, FolderKanban, Users, Search, Wallet,
  Receipt, Repeat, Flag, Package, Briefcase, CreditCard,
  Building2, UserCheck,
  // UI helpers
  ChevronLeft, ChevronRight, ChevronDown, ChevronUp, X,
  MoreHorizontal, Save, Loader2, ExternalLink,
} from 'lucide-react'

const ICON_MAP = {
  // Feature
  Circle, PenTool, Code2, Eye, FlaskConical, Zap, Archive,
  Flame, ArrowUp, Minus, ArrowDown, Sparkles,
  // Issue
  Bug, CheckSquare, AlertOctagon, ShieldAlert, Gauge,
  MessageCircle, FileText, CircleDot, Filter, Play,
  Check, CheckCheck, XCircle, Copy, RotateCcw, Clock,
  AlertTriangle, AlertCircle, Info,
  // Release
  ArrowUpCircle, Wrench, Calendar, CheckCircle2, Rocket,
  Plus, RefreshCw, Trash2, Layers,
  // Doc content
  PenLine, MessageSquare, ArrowRight, Database, ArrowRightLeft,
  Shield, Activity, Phone, Boxes, Link, Target, ListChecks,
  FileSignature, BookOpen, Book, Tag, List,
  // Visibility
  Globe, Lock,
  // Modules
  KeyRound, Bell, FolderKanban, Users, Search, Wallet,
  Receipt, Repeat, Flag, Package, Briefcase, CreditCard,
  Building2, UserCheck,
  // UI
  ChevronLeft, ChevronRight, ChevronDown, ChevronUp, X,
  MoreHorizontal, Save, Loader2, ExternalLink,
}

export const Icon = ({
  name,
  size = 14,
  strokeWidth = 1.75,
  className,
  ...props
}) => {
  const Cmp = ICON_MAP[name] || Circle
  return <Cmp size={size} strokeWidth={strokeWidth} className={className} {...props} />
}

/** Vérifie si une icône existe (utile pour fallback conditionnel) */
export const hasIcon = (name) => Boolean(ICON_MAP[name])

export default Icon