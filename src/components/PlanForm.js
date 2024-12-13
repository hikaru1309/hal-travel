import React, { useState } from 'react';

const PlanForm = ({ onSubmit }) => {
    const [formData, setFormData] = useState({
        destination: '',
        duration: '',
        budget: '',
        request: '',
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(formData); // フォームデータを親コンポーネントに渡す
    };

    return (
        <div>
            <h2>旅行プラン作成</h2>
            <form onSubmit={handleSubmit}>
                <label>
                    目的地:
                    <input
                        type="text"
                        name="destination"
                        value={formData.destination}
                        onChange={handleChange}
                        required
                    />
                </label>
                <br />
                <label>
                    日程（日数）:
                    <input
                        type="number"
                        name="duration"
                        value={formData.duration}
                        onChange={handleChange}
                        required
                    />
                </label>
                <br />
                <label>
                    予算（円）:
                    <input
                        type="number"
                        name="budget"
                        value={formData.budget}
                        onChange={handleChange}
                        required
                    />
                </label>
                <br />
                <label>
                    特別なリクエスト:
                    <textarea
                        name="request"
                        value={formData.request}
                        onChange={handleChange}
                    />
                </label>
                <br />
                <button type="submit">プランを生成</button>
            </form>
        </div>
    );
};

export default PlanForm;
