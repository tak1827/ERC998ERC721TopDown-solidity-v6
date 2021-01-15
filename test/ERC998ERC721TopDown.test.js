const { expectEvent, expectRevert, BN } = require('@openzeppelin/test-helpers')
const web3Utils = require('web3-utils');
const { expect } = require('chai')

const ERC998ERC721TopDown = artifacts.require("ERC998ERC721TopDown")

contract("ERC998ERC721TopDown", ([deployer, alice, bob, tokenHolder, newHolder, approvedHolder, attacker]) => {

  let parentContract
  let childContract

  const bytes1 = web3Utils.padLeft(web3Utils.toHex(1), 32)
  const bytes2 = web3Utils.padLeft(web3Utils.toHex(2), 32)
  const bytes3 = web3Utils.padLeft(web3Utils.toHex(3), 32)

  beforeEach(async function() {
    parentContract = await ERC998ERC721TopDown.new()
    childContract = await ERC998ERC721TopDown.new()
  })

  describe("Support ERC998", async () => {
    it('should mint a 721 token, Composable', async () => {
      const tokenId = await parentContract.mint.call(alice)
      expect(tokenId).to.be.bignumber.equal(new BN("1"))
      await parentContract.mint(alice)
      const owner = await parentContract.ownerOf(tokenId)
      assert.equal(owner, alice)
    })

    it('should safeTransferFrom childContract to parentContract', async () => {
      await parentContract.mint(alice)
      await childContract.mint(alice)

      const receipt = await childContract.methods['safeTransferFrom(address,address,uint256,bytes)'](alice, parentContract.address, 1, bytes1, { from: alice });
      await expectEvent(receipt, 'ReceivedChild', {
        _from: alice, _tokenId: new BN('1'), _childContract: childContract.address, _childTokenId: new BN('1') })
      const owned = await parentContract.childExists(childContract.address, 1)
      assert(owned, 'parentContract does not own childContract')

      const result = await parentContract.ownerOfChild(childContract.address, 1)
      expect(result.parentTokenId).to.be.bignumber.equal(new BN("1"))

      const contracts = await parentContract.totalChildContracts.call(1)
      assert.equal(contracts.toNumber(), 1)

      const contract = await parentContract.childContractByIndex.call(1, 0)
      assert.equal(contract, childContract.address)

      const tokenId = await parentContract.childTokenByIndex.call(1,childContract.address,0)
      expect(tokenId).to.be.bignumber.equal(new BN("1"))
    })

    it('should transfer composable to bob', async () => {
      await parentContract.mint(alice)
      await childContract.mint(alice)
      await childContract.methods['safeTransferFrom(address,address,uint256,bytes)'](alice, parentContract.address, 1, bytes1, { from: alice });

      const receipt = await parentContract.transferFrom(alice, bob, 1, {from: alice})
      await expectEvent(receipt, 'Transfer', { from: alice, to: bob, tokenId: new BN('1') })

      const owner = await parentContract.ownerOf.call(1);
      assert.equal(owner, bob)
    })

    it('should transfer child to alice', async () => {
      await parentContract.mint(alice)
      await childContract.mint(alice)
      await childContract.methods['safeTransferFrom(address,address,uint256,bytes)'](alice, parentContract.address, 1, bytes1, { from: alice });
      await parentContract.transferFrom(alice, bob, 1, {from: alice})

      const receipt = await parentContract.transferChild(1, alice, childContract.address, 1, { from: bob })
      await expectEvent(receipt, 'TransferChild', {
        tokenId: new BN('1'), _to: alice, _childContract: childContract.address, _childTokenId: new BN('1') })

      const owner = await childContract.ownerOf.call(1)
      assert.equal(owner, alice)

      const contracts = await parentContract.totalChildContracts(1)
      assert.equal(contracts.toNumber(), 0)

      const owned = await parentContract.childExists(childContract.address, 1)
      assert.equal(owned, false)

      const tokns = await parentContract.totalChildTokens(1, childContract.address)
      assert.equal(tokns.toNumber(), 0)
    })

    it('should safeTransferChild from composable 2 to composable 1', async () => {
      await parentContract.mint(alice)
      await parentContract.mint(alice)
      await childContract.mint(alice)
      await childContract.mint(alice)
      await childContract.methods['safeTransferFrom(address,address,uint256,bytes)'](alice, parentContract.address, 2, bytes2, { from: alice });

      const receipt = await parentContract.methods['safeTransferChild(uint256,address,address,uint256,bytes)'](2, parentContract.address, childContract.address, 2, bytes1, {from: alice})
      await expectEvent(receipt, 'TransferChild', {
        tokenId: new BN('2'), _to: parentContract.address, _childContract: childContract.address, _childTokenId: new BN('2') })

      const contracts = await parentContract.totalChildContracts.call(1)
      assert.equal(contracts.toNumber(), 1)
      const contract = await parentContract.childContractByIndex.call(1,0)
      assert.equal(contract, childContract.address)
      const owned = await parentContract.childExists(childContract.address, 2)
      assert.equal(owned, true)
      const address = await childContract.ownerOf.call(2)
      assert.equal(address, parentContract.address)
      const result = await parentContract.ownerOfChild.call(childContract.address, 2);
      expect(result.parentTokenId).to.be.bignumber.equal(new BN("1"))
      const childs = await parentContract.totalChildTokens.call(2, childContract.address)
      expect(childs).to.be.bignumber.equal(new BN("0"))
    })
  })
})
