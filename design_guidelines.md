# Design Guidelines: AI-Powered Gift Discovery Platform

## Design Approach
**Reference-Based Approach** - Drawing inspiration from modern e-commerce and recommendation platforms like Etsy, Pinterest, and Airbnb. Focus on creating an emotionally engaging, trustworthy experience that makes gift-giving feel personal and meaningful.

## Core Design Principles
- **Personal & Warm**: Create an inviting atmosphere that celebrates relationships and thoughtful giving
- **Trust & Reliability**: Professional yet approachable design that builds confidence in AI recommendations
- **Simplified Decision-Making**: Clear visual hierarchy that guides users through the gift discovery process

## Color Palette

### Primary Colors
- **Brand Primary**: 259 47% 35% (Deep purple-blue for trust and sophistication)
- **Brand Secondary**: 259 47% 55% (Lighter variant for interactive elements)

### Supporting Colors
- **Success/Positive**: 142 76% 45% (Warm green for confirmations)
- **Neutral Base**: 220 15% 97% (Light background)
- **Text Primary**: 220 15% 15% (Dark charcoal)
- **Text Secondary**: 220 8% 45% (Medium gray)

### Accent Colors (Use Sparingly)
- **Warm Accent**: 24 85% 65% (Coral-orange for highlights and CTAs)

## Typography
- **Primary Font**: Inter (Google Fonts) - clean, modern, excellent readability
- **Headings**: Font weights 600-700, larger sizes for emotional impact
- **Body Text**: Font weight 400-500, comfortable reading sizes
- **UI Elements**: Font weight 500, consistent sizing

## Layout System
**Tailwind Spacing Units**: Primarily use 2, 4, 6, 8, 12, 16 for consistent spacing rhythm
- Small gaps/padding: 2, 4
- Medium spacing: 6, 8  
- Large sections: 12, 16
- Component spacing: 4, 6, 8

## Component Library

### Navigation
- Clean header with logo, minimal navigation links
- Subtle shadows and rounded corners (rounded-lg)
- Mobile-first responsive design

### Forms (Gift Finder)
- Generous spacing between form fields
- Soft rounded inputs (rounded-md)
- Clear labels and helpful placeholder text
- Progress indication for multi-step flows
- Prominent CTA buttons with warm accent colors

### Cards & Recommendations
- Clean product/gift cards with subtle shadows
- Consistent image aspect ratios
- Clear typography hierarchy
- Quick action buttons (save, share)

### Hero Section
- Large, engaging hero with lifestyle imagery
- Headline emphasizing emotional benefits
- Clear value proposition
- Primary CTA prominently placed

## Visual Treatments

### Gradients
- Subtle gradients on hero backgrounds: From 259 47% 45% to 259 47% 35%
- Button gradients for premium feel on primary CTAs
- Avoid overuse - reserve for key conversion points

### Background Treatments
- Clean white/light backgrounds for readability
- Subtle color blocks in very light tints for section separation
- Gentle gradients as overlays on hero images

### Button Styling
- **Primary**: Solid buttons with warm accent color
- **Outline buttons on images**: Always implement blurred backgrounds for readability
- **No custom hover states**: Rely on default Button component interactions

## Images
- **Hero Image**: Large lifestyle image showing people giving/receiving gifts or enjoying experiences together
- **Category Icons**: Simple, consistent iconography for interests/categories
- **Gift Examples**: High-quality product imagery in consistent aspect ratios
- **Testimonial/Social Proof**: Candid photos of happy gift recipients

## Key Sections (Maximum 4-5)
1. **Hero**: Value proposition with emotional appeal
2. **How It Works**: Simple 3-4 step process explanation  
3. **Gift Finder Form**: The core interactive experience
4. **Social Proof/Features**: Benefits and trust signals
5. **CTA Section**: Final conversion opportunity

## Accessibility & Performance
- High contrast ratios for all text
- Consistent dark mode support across all components
- Optimized image loading for gift galleries
- Keyboard navigation for all interactive elements
- Screen reader friendly form labels

This design balances emotional appeal with functional clarity, creating a trustworthy platform that makes thoughtful gift-giving accessible and enjoyable.