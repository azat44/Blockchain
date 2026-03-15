// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract InvoicePayment {
    enum InvoiceStatus { Pending, Paid }

    struct Invoice {
        uint256 id;
        address issuer;
        address payer;
        uint256 amount;
        string description;
        InvoiceStatus status;
        uint256 paidAt;
        bytes32 txHash;
    }

    IERC20 public immutable paymentToken;
    address public owner;
    uint256 public nextInvoiceId;
    mapping(uint256 => Invoice) public invoices;

    event InvoiceCreated(uint256 indexed invoiceId, address indexed issuer, address payer, uint256 amount, string description);
    event InvoicePaid(uint256 indexed invoiceId, address indexed payer, uint256 amount, uint256 paidAt);

    constructor(address _paymentToken) {
        require(_paymentToken != address(0), "Token address cannot be zero");
        paymentToken = IERC20(_paymentToken);
        owner = msg.sender;
    }

    function createInvoice(address _payer, uint256 _amount, string calldata _description) external returns (uint256) {
        require(_amount > 0, "Amount must be greater than zero");
        uint256 invoiceId = nextInvoiceId++;
        invoices[invoiceId] = Invoice({
            id: invoiceId, issuer: msg.sender, payer: _payer, amount: _amount,
            description: _description, status: InvoiceStatus.Pending, paidAt: 0, txHash: bytes32(0)
        });
        emit InvoiceCreated(invoiceId, msg.sender, _payer, _amount, _description);
        return invoiceId;
    }

    function payInvoice(uint256 _invoiceId) external {
        Invoice storage inv = invoices[_invoiceId];
        require(inv.amount > 0, "Invoice does not exist");
        require(inv.status == InvoiceStatus.Pending, "Invoice already paid");
        require(inv.payer == address(0) || inv.payer == msg.sender, "Not authorized");
        bool success = paymentToken.transferFrom(msg.sender, inv.issuer, inv.amount);
        require(success, "Token transfer failed");
        inv.status = InvoiceStatus.Paid;
        inv.paidAt = block.timestamp;
        emit InvoicePaid(_invoiceId, msg.sender, inv.amount, block.timestamp);
    }

    function getInvoice(uint256 _invoiceId) external view returns (Invoice memory) {
        return invoices[_invoiceId];
    }
}