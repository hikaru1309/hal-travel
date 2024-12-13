import React from 'react';
import './Modal.css'; // CSSファイルでモーダルデザインを調整

const Modal = ({ isOpen, onClose, data }) => {
    if (!isOpen) return null; // モーダルが開いていないときは何も表示しない

    return (
        <div
            className="modal-overlay"
            onClick={onClose} // 背景クリックでモーダルを閉じる
        >
            <div
                className="modal-content"
                onClick={(e) => e.stopPropagation()} // モーダル内部クリックでは閉じない
            >
                <button className="modal-close" onClick={onClose}>
                    ×
                </button>
                <h2>{data?.name || '観光地の詳細'}</h2>
                <p>{data?.description || '詳細情報がありません。'}</p>
                {data?.image && (
                    <img
                        src={data.image}
                        alt={data.name}
                        className="modal-image"
                    />
                )}
            </div>
        </div>
    );
};

export default Modal;
