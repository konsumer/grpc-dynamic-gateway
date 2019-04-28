'use strict'

/* global describe, it, expect */
const { convertParams, convertUrl, convertBody, getParamsList, convertHeaders } = require('..')

describe('gRPC Dynamic Gateway', () => {
  describe('convertParams()', () => {
    it('should handle /v1/hi/{name}', () => {
      const req = {
        body: {
          v1: true,
          v2: false
        },
        params: {
          name: 'Cool'
        }
      }
      const result = convertParams(req, '/v1/hi/{name}')
      expect(result.name).toBe('Cool')
      expect(result.v1).toBe(true)
      expect(result.v2).toBe(false)
    })
  })

  describe('convertUrl()', () => {
    it('should correctly convert /v1/hi/{name} into express URL', () => {
      const result = convertUrl('/v1/hi/{name}')
      expect(result).toBe('/v1/hi/:name')
    })

    it('should correctly convert /{version}/hi/{name}/{cool} into express URL', () => {
      const result = convertUrl('/{version}/hi/{name}/{cool}')
      expect(result).toBe('/:version/hi/:name/:cool')
    })
  })

  describe('convertBody()', () => {
    it('should handle {cool: true}, *', () => {
      const result = convertBody({ cool: true }, '*')
      expect(result.cool).toBe(true)
    })

    it('should handle {cool: true}, cool', () => {
      const result = convertBody({ cool: true }, 'cool')
      expect(result).toBe(true)
    })
  })

  describe('getParamsList()', () => {
    it('should find params in /v1/hi/{name}?tester=Cool', () => {
      const req = {
        query: {
          tester: 'Cool'
        }
      }
      const result = getParamsList(req, '/v1/hi/{name}')
      expect(result).toContain('name')
      expect(result).toContain('tester')
    })

    it('should find params in /{version}/hi/{name}/{cool}?tester=Cool', () => {
      const req = {
        query: {
          tester: 'Cool'
        }
      }
      const result = getParamsList(req, '/{version}/hi/{name}/{cool}')
      expect(result).toContain('name')
      expect(result).toContain('cool')
      expect(result).toContain('tester')
    })
  })

  describe('convertHeaders()', () => {
    it('should convert a Authorize token in header to a metadata object', () => {
      const result = convertHeaders({ 'Authorize': 'Bearer DUMMY_TOKEN' })
      expect(result.constructor.name).toBe('Metadata')
      expect(result._internal_repr.authorize).toContain('Bearer DUMMY_TOKEN')
    })
  })
})
