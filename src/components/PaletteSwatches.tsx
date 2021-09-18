import chroma from 'chroma-js'
import React, { FC, Fragment, useEffect, useState } from 'react'
import styled from 'styled-components'
import {
  clampLch,
  getMostContrast,
  toHex,
  toLch,
  valid,
  wcagContrast,
  apcaContrast,
} from '../color'
import {
  addHue,
  addTone,
  duplicateHue,
  duplicateTone,
  removeHue,
  removeTone,
  renameHue,
  renameTone,
  reorderHues,
  reorderTones,
  setColor,
} from '../palette'
import { LCH, OverlayMode, Palette } from '../types'
import { useKeyPress } from '../useKeyPress'

const contrast = {
  WCAG: wcagContrast,
  APCA: apcaContrast,
}

type PaletteSwatchesProps = {
  palette: Palette
  selected: [number, number]
  overlayMode: OverlayMode
  contrastTo: string
  onSelect: (selected: [number, number]) => void
  onPaletteChange: (palette: Palette) => void
}

export const PaletteSwatches: FC<PaletteSwatchesProps> = ({
  palette,
  selected,
  overlayMode,
  contrastTo,
  onSelect,
  onPaletteChange,
}) => {
  const lPress = useKeyPress('l')
  const cPress = useKeyPress('c')
  const hPress = useKeyPress('h')
  const bPress = useKeyPress('b')
  const [copiedColor, setCopiedColor] = useState<LCH>([0, 0, 0])
  const { hues, tones, colors } = palette
  const [selectedHue, selectedTone] = selected
  const hexColors = colors.map(arr => arr.map(toHex))
  const selectedColorLch = colors[selectedHue][selectedTone]

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const { key, metaKey, shiftKey } = e
      if (!filterInput(e)) return
      const noDefault = (func: () => any) => {
        e.preventDefault()
        func()
      }
      if (metaKey && key === 'c') return copyCurrent()
      if (metaKey && key === 'v') return pasteToCurrent()

      // Modify color
      if (lPress || cPress || hPress) {
        e.preventDefault()
        let [l, c, h] = selectedColorLch
        if (key === 'ArrowUp') {
          if (lPress) l += 0.5
          if (cPress) c += 0.5
          if (hPress) h += 0.5
        }
        if (key === 'ArrowDown') {
          if (lPress) l -= 0.5
          if (cPress) c -= 0.5
          if (hPress) h -= 0.5
        }
        onPaletteChange(
          setColor(palette, clampLch([l, c, h]), selectedHue, selectedTone)
        )
        return
      }

      // Duplicate row or column
      if (metaKey && shiftKey) {
        if (key === 'ArrowUp') return noDefault(duplicateUp)
        if (key === 'ArrowDown') return noDefault(duplicateDown)
        if (key === 'ArrowLeft') return noDefault(duplicateLeft)
        if (key === 'ArrowRight') return noDefault(duplicateRight)
      }

      // Move row or column
      if (metaKey) {
        if (key === 'ArrowUp') return noDefault(moveRowUp)
        if (key === 'ArrowDown') return noDefault(moveRowDown)
        if (key === 'ArrowLeft') return noDefault(moveColumnLeft)
        if (key === 'ArrowRight') return noDefault(moveColumnRight)
      }

      // Select color
      if (key === 'ArrowUp') return noDefault(selectUp)
      if (key === 'ArrowDown') return noDefault(selectDown)
      if (key === 'ArrowLeft') return noDefault(selectLeft)
      if (key === 'ArrowRight') return noDefault(selectRight)

      function copyCurrent() {
        navigator.clipboard.writeText(toHex(selectedColorLch))
        setCopiedColor([...selectedColorLch] as LCH)
      }
      function pasteToCurrent() {
        navigator.clipboard.readText().then(hex => {
          if (valid(hex))
            onPaletteChange(
              setColor(palette, toLch(hex), selectedHue, selectedTone)
            )
        })
      }

      function moveRowUp() {
        if (selectedHue <= 0) return
        onPaletteChange(reorderHues(palette, selectedHue, selectedHue - 1))
        onSelect([selectedHue - 1, selectedTone])
      }
      function moveRowDown() {
        if (selectedHue >= hues.length - 1) return
        onPaletteChange(reorderHues(palette, selectedHue, selectedHue + 1))
        onSelect([selectedHue + 1, selectedTone])
      }
      function moveColumnLeft() {
        if (selectedTone <= 0) return
        onPaletteChange(reorderTones(palette, selectedTone, selectedTone - 1))
        onSelect([selectedHue, selectedTone - 1])
      }
      function moveColumnRight() {
        if (selectedTone >= tones.length - 1) return
        onPaletteChange(reorderTones(palette, selectedTone, selectedTone + 1))
        onSelect([selectedHue, selectedTone + 1])
      }

      function duplicateUp() {
        onPaletteChange(duplicateHue(palette, selectedHue, selectedHue))
      }
      function duplicateDown() {
        onPaletteChange(duplicateHue(palette, selectedHue, selectedHue + 1))
        onSelect([selectedHue + 1, selectedTone])
      }
      function duplicateLeft() {
        onPaletteChange(duplicateTone(palette, selectedTone, selectedTone))
        onSelect([selectedHue, selectedTone])
      }
      function duplicateRight() {
        onPaletteChange(duplicateTone(palette, selectedTone, selectedTone + 1))
        onSelect([selectedHue, selectedTone + 1])
      }

      function selectUp() {
        if (selectedHue <= 0) return
        onSelect([selectedHue - 1, selectedTone])
      }
      function selectDown() {
        if (selectedHue >= hues.length - 1) return
        onSelect([selectedHue + 1, selectedTone])
      }
      function selectLeft() {
        if (selectedTone <= 0) return
        onSelect([selectedHue, selectedTone - 1])
      }
      function selectRight() {
        if (selectedTone >= tones.length - 1) return
        onSelect([selectedHue, selectedTone + 1])
      }
    }
    window.addEventListener('keydown', handler)
    return () => {
      window.removeEventListener('keydown', handler)
    }
  }, [
    cPress,
    copiedColor,
    hPress,
    hues.length,
    lPress,
    onPaletteChange,
    onSelect,
    palette,
    selectedColorLch,
    selectedHue,
    selectedTone,
    tones.length,
  ])

  return (
    <Wrapper columns={tones.length} rows={hues.length}>
      {/* HEADER */}
      <div />
      {tones.map((toneName, tone) => (
        <ToneInput
          key={tone}
          value={toneName}
          onKeyDown={e => e.stopPropagation()}
          onChange={e =>
            onPaletteChange(renameTone(palette, tone, e.target.value))
          }
        />
      ))}
      <SmallButton
        title="Add tone"
        onClick={() => onPaletteChange(addTone(palette))}
      >
        +
      </SmallButton>

      {/* HUES */}
      {hexColors.map((hueColors, hue) => (
        <Fragment key={hue}>
          <HueInput
            key={hue}
            value={hues[hue]}
            onKeyDown={e => e.stopPropagation()}
            onChange={e =>
              onPaletteChange(renameHue(palette, hue, e.target.value))
            }
          />
          {hueColors.map((color, tone) => (
            <Swatch
              key={color + tone}
              color={!bPress ? color : chroma(color).desaturate(10).hex()}
              contrast={contrast[overlayMode](contrastTo, color)}
              isSelected={hue === selectedHue && tone === selectedTone}
              onSelect={() => onSelect([hue, tone])}
            />
          ))}
          <SmallButton
            title="Delete this row"
            onClick={() => onPaletteChange(removeHue(palette, hue))}
          >
            ×
          </SmallButton>
        </Fragment>
      ))}

      {/* COLUMN BUTTONS */}
      <SmallButton
        title="Add row"
        onClick={() => onPaletteChange(addHue(palette))}
      >
        +
      </SmallButton>
      {tones.map((toneName, tone) => (
        <SmallButton
          key={tone}
          title="Delete this column"
          onClick={() => onPaletteChange(removeTone(palette, tone))}
        >
          ×
        </SmallButton>
      ))}
    </Wrapper>
  )
}

const Wrapper = styled.div<{ columns: number; rows: number }>`
  display: grid;
  grid-template-columns: 64px repeat(${p => p.columns}, 48px) 16px;
  grid-template-rows: 24px repeat(${p => p.rows}, 48px) 16px;
`

const HueInput = styled.input`
  border: 0;
  padding: 0;
  background: transparent;
`
const ToneInput = styled(HueInput)`
  text-align: center;
  padding: 4px 0;
`

type SwatchProps = {
  color: string
  contrast: number
  isSelected: boolean
  onSelect: () => void
}

const Swatch: FC<SwatchProps> = props => {
  const { color, isSelected, onSelect, contrast } = props
  const contrastRatio = Math.floor(contrast * 10) / 10
  return (
    <SwatchWrapper
      style={{
        backgroundColor: color,
        color: getMostContrast(color, ['black', 'white']),
      }}
      isSelected={isSelected}
      onClick={onSelect}
    >
      <span>{contrastRatio}</span>
    </SwatchWrapper>
  )
}

const SwatchWrapper = styled.button<{ isSelected: boolean }>`
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border: ${p =>
    p.isSelected
      ? '6px solid var(--c-bg, white)'
      : '0px solid var(--c-bg, white)'};
  border-radius: 0;
  transition: 100ms ease-in-out;
`

const SmallButton = styled.button`
  background: transparent;
  border: none;
  padding: 0;
  cursor: pointer;
  line-height: 16px;
  opacity: 0;
  transition: 200ms ease-in-out;

  :hover {
    background: var(--c-input-bg-hover);
  }

  ${Wrapper}:hover & {
    opacity: 1;
  }
`

/** Detects if keyboard input is from editable field */
function filterInput(event: KeyboardEvent) {
  const target = event.target
  if (!target) return true
  // @ts-ignore
  const { tagName, isContentEditable, readOnly } = target
  if (isContentEditable) return false
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tagName) && !readOnly)
    return false
  return true
}
