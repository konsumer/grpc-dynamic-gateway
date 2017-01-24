/* global describe, it, expect */
const { generateSwagger, convertParams, convertUrl, convertBody, getParamsList } = require('..')

describe('gRPC Dynamic Gateway', () => {
  describe('generateSwagger()', () => {
    it('should generate correct swagger', () => {
      expect(generateSwagger([`${__dirname}/../example/api.proto`, `${__dirname}/test.proto`])).toMatchSnapshot()
    })
  })

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
      expect(convertParams(req, '/v1/hi/{name}')).toMatchSnapshot()
    })
  })

  describe('convertUrl()', () => {
    it('should correctly convert /v1/hi/{name} into express URL', () => {
      expect(convertUrl('/v1/hi/{name}')).toMatchSnapshot()
    })
    it('should correctly convert /{version}/hi/{name}/{cool} into express URL', () => {
      expect(convertUrl('/{version}/hi/{name}/{cool}')).toMatchSnapshot()
    })
  })

  describe('convertBody()', () => {
    it('should handle {cool: true}, *', () => {
      expect(convertBody({cool: true}, '*')).toMatchSnapshot()
    })
    it('should handle {cool: true}, cool', () => {
      expect(convertBody({cool: true}, 'cool')).toMatchSnapshot()
    })
  })

  describe('getParamsList()', () => {
    it('should find params in /v1/hi/{name}', () => {
      expect(getParamsList('/v1/hi/{name}')).toMatchSnapshot()
    })
    it('should find params in /{version}/hi/{name}/{cool}', () => {
      expect(getParamsList('/{version}/hi/{name}/{cool}')).toMatchSnapshot()
    })
  })
})
