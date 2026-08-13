// Generated from packages/design-tokens/tokens.json. Do not edit.
import SwiftUI

enum DesignTokens {
    static let canvas = Color(hex: 0xFFFAF9F7)
    static let surface = Color(hex: 0xFFFFFFFF)
    static let surfaceWarm = Color(hex: 0xFFF5F1ED)
    static let surfaceBlush = Color(hex: 0xFFF3E8E1)
    static let surfaceGlass = Color(hex: 0xFFFFFAF4)
    static let surfaceCream = Color(hex: 0xFFFFFDFA)
    static let surfacePeach = Color(hex: 0xFFFFFAF7)
    static let ink = Color(hex: 0xFF24211F)
    static let inkSoft = Color(hex: 0xFF746D68)
    static let inkMuted = Color(hex: 0xFFA59B94)
    static let inkFaint = Color(hex: 0xFFAAA099)
    static let inkMuted2 = Color(hex: 0xFFA0968F)
    static let inkSoft2 = Color(hex: 0xFF806F67)
    static let inkLabel = Color(hex: 0xFF98887D)
    static let inkFgSoft = Color(hex: 0xFF6D625C)
    static let line = Color(hex: 0xFFE7E0DA)
    static let lineSoft = Color(hex: 0xFFE7DDD6)
    static let lineWarm = Color(hex: 0xFFEEE3DC)
    static let lineDeep = Color(hex: 0xFFE8E0DA)
    static let accent = Color(hex: 0xFFB7654D)
    static let accentHover = Color(hex: 0xFF9F513E)
    static let accentMuted = Color(hex: 0xFFA26450)
    static let accentInk = Color(hex: 0xFFFFFFFF)
    static let success = Color(hex: 0xFF6F8E68)
    static let warning = Color(hex: 0xFFA97943)
    static let danger = Color(hex: 0xFFB45B55)
    static let plum = Color(hex: 0xFF3E2931)
    static let blush = Color(hex: 0xFFF1D6CE)
    static let moss = Color(hex: 0xFF516657)
    static let focusRing = Color(hex: 0xFFB7654D)
    static let avatar = Color(hex: 0xFFC68D75)
    static let iconFaint = Color(hex: 0xFFB7AAA2)
    static let iconMuted = Color(hex: 0xFFA99B92)
    static let space1: CGFloat = 4
    static let space2: CGFloat = 8
    static let space3: CGFloat = 12
    static let space4: CGFloat = 16
    static let space5: CGFloat = 24
    static let space6: CGFloat = 32
    static let space7: CGFloat = 48
    static let space8: CGFloat = 64
    static let radiusSm: CGFloat = 8
    static let radiusMd: CGFloat = 12
    static let radiusLg: CGFloat = 20
    static let radiusCard: CGFloat = 14
    static let radiusControl: CGFloat = 10
    static let radiusTight: CGFloat = 9
    static let radiusPill: CGFloat = 999
    static let typographyDisplay: CGFloat = 64
    static let typographyPage: CGFloat = 44
    static let typographySection: CGFloat = 28
    static let typographyCard: CGFloat = 18
    static let typographyBody: CGFloat = 14
    static let typographyMeta: CGFloat = 12
}

extension Color {
    init(hex: UInt) { self.init(.sRGB, red: Double((hex >> 16) & 0xFF) / 255, green: Double((hex >> 8) & 0xFF) / 255, blue: Double(hex & 0xFF) / 255, opacity: 1) }
}
