import { describe, it, expect, vi, beforeEach } from 'vitest'
import { promptTemplate, TEMPLATES, DEFAULT_AVAILABLE_TEMPLATES } from '../cli/template'
import * as prompts from '@clack/prompts'

vi.mock('@clack/prompts')

describe('Template', () => {
  describe('TEMPLATES constant', () => {
    it('should have all required templates', () => {
      const templateNames = TEMPLATES.map(t => t.name)
      expect(templateNames).toContain('openfort-ui')
      expect(templateNames).toContain('headless')
      expect(templateNames).toContain('firebase')
    })

    it('should have display names and colors', () => {
      TEMPLATES.forEach(template => {
        expect(template.display).toBeTruthy()
        expect(template.color).toBeTypeOf('function')
      })
    })
  })

  describe('DEFAULT_AVAILABLE_TEMPLATES', () => {
    it('should match all template names', () => {
      expect(DEFAULT_AVAILABLE_TEMPLATES).toEqual(['openfort-ui', 'headless', 'firebase'])
    })
  })

  describe('promptTemplate', () => {
    beforeEach(() => {
      vi.mocked(prompts.select).mockReset()
      vi.mocked(prompts.isCancel).mockReset()
    })

    it('should return argTemplate when valid', async () => {
      const result = await promptTemplate({
        argTemplate: 'openfort-ui',
      })
      
      expect(result).toBe('openfort-ui')
      expect(prompts.select).not.toHaveBeenCalled()
    })

    it('should prompt when no argTemplate is provided', async () => {
      vi.mocked(prompts.select).mockResolvedValue({ name: 'headless' })
      vi.mocked(prompts.isCancel).mockReturnValue(false)
      
      const result = await promptTemplate({})
      
      expect(prompts.select).toHaveBeenCalled()
      expect(result).toBe('headless')
    })

    it('should prompt when argTemplate is invalid', async () => {
      vi.mocked(prompts.select).mockResolvedValue({ name: 'openfort-ui' })
      vi.mocked(prompts.isCancel).mockReturnValue(false)
      
      const result = await promptTemplate({
        argTemplate: 'invalid-template',
      })
      
      expect(prompts.select).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('invalid-template'),
        })
      )
      expect(result).toBe('openfort-ui')
    })

    it('should handle user cancellation', async () => {
      vi.mocked(prompts.select).mockResolvedValue(Symbol('cancel'))
      vi.mocked(prompts.isCancel).mockReturnValue(true)
      
      const result = await promptTemplate({})
      
      expect(result).toBeUndefined()
    })

    it('should respect availableTemplates filter', async () => {
      vi.mocked(prompts.select).mockResolvedValue({ name: 'openfort-ui' })
      vi.mocked(prompts.isCancel).mockReturnValue(false)
      
      // Even though argTemplate is valid, it's not in availableTemplates
      const result = await promptTemplate({
        argTemplate: 'firebase',
        availableTemplates: ['openfort-ui', 'headless'],
      })
      
      // Should prompt because firebase is not available
      expect(prompts.select).toHaveBeenCalled()
      expect(result).toBe('openfort-ui')
    })

    it('should accept argTemplate when it is in availableTemplates', async () => {
      const result = await promptTemplate({
        argTemplate: 'openfort-ui',
        availableTemplates: ['openfort-ui', 'headless'],
      })
      
      expect(prompts.select).not.toHaveBeenCalled()
      expect(result).toBe('openfort-ui')
    })

    it('should include all templates in select options', async () => {
      vi.mocked(prompts.select).mockResolvedValue({ name: 'headless' })
      vi.mocked(prompts.isCancel).mockReturnValue(false)
      
      await promptTemplate({})
      
      const selectCall = vi.mocked(prompts.select).mock.calls[0][0]
      expect(selectCall.options).toHaveLength(TEMPLATES.length)
    })
  })
})

