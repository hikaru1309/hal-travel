import React, { useState } from 'react';
import './PlanList.css';
import Modal from './Modal'; // モーダルコンポーネントをインポート

const PlanList = ({ plansByDay }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedData, setSelectedData] = useState(null);

    // ダミーデータ
    const dummyDetails = {
        name: '浅草寺',
        description: '東京の有名な観光地。歴史的な仏教寺院。',
        image: 'https://via.placeholder.com/400', // ダミー画像
    };

    const handleCardClick = (dayPlan) => {
        // ダミーデータを直接渡す
        setSelectedData({
            name: `Day ${dayPlan.day || '1'}`, // Dayの情報
            description: dummyDetails.description, // ダミーの説明
            image: dummyDetails.image, // ダミーの画像
        });
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedData(null);
    };

    return (
        <div className="plan-list">
            {plansByDay.map((dayPlan, index) => (
                <div
                    key={index}
                    className="plan-card"
                    onClick={() => handleCardClick({ day: index + 1 })}
                >
                    <h3>Day {index + 1}</h3>
                    <ul>
                        {dayPlan.map((place, placeIndex) => (
                            <li key={placeIndex}>{place}</li>
                        ))}
                    </ul>
                </div>
            ))}
            <Modal isOpen={isModalOpen} onClose={handleCloseModal} data={selectedData} />
        </div>
    );
};

export default PlanList;
