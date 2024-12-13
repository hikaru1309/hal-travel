import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import PlanForm from './PlanForm';
import PlanList from './PlanList';
import Map from './Map'; // 新しく作成したMapコンポーネントをインポート

const Home = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { username } = location.state || { username: 'ゲスト' };

    const [plan, setPlan] = useState(null);
    const [markers, setMarkers] = useState([]);
    const [directions, setDirections] = useState(null);
    const [googleMapsApiKey, setGoogleMapsApiKey] = useState('');
    const [error, setError] = useState(null);
    const [mapCenter, setMapCenter] = useState({ lat: 35.1815, lng: 136.9066 });
    const [duration, setDuration] = useState(0); // 日程数を保存

    const containerStyle = {
        width: '100%',
        height: '500px',
    };

    useEffect(() => {
        const fetchApiKey = async () => {
            try {
                const response = await fetch('http://localhost:5000/api/config');
                const data = await response.json();
                if (!data.GOOGLE_MAPS_API_KEY) {
                    throw new Error('APIキーが空です');
                }
                setGoogleMapsApiKey(data.GOOGLE_MAPS_API_KEY);
            } catch (err) {
                console.error('Google Maps APIキーの取得に失敗しました:', err);
                setError('Google Maps API Keyの取得に失敗しました。');
            }
        };

        fetchApiKey();
    }, []);

    const handlePlanSubmit = async (formData) => {
      try {
          // ユーザーが入力した日数をセット
          setDuration(formData.duration);
  
          const response = await fetch('http://localhost:5000/generate-plan', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(formData),
          });
  
          if (!response.ok) {
              throw new Error('旅行プランの生成に失敗しました。');
          }
  
          const { plan, places } = await response.json();
          console.log('APIから受け取ったデータ:', plan, places);
  
          if (typeof plan === 'string') {
              setPlan(plan.split('\n'));
          } else if (Array.isArray(plan)) {
              setPlan(plan);
          } else {
              throw new Error('`plan` の形式が無効です。');
          }
  
          if (!places || !Array.isArray(places) || places.length === 0) {
              throw new Error('観光地リストが空です。');
          }
  
          const geocodeResponse = await fetch('http://localhost:5000/geocode-locations', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ locations: places.flat() }),
          });
  
          if (!geocodeResponse.ok) {
              throw new Error('観光地の位置情報取得に失敗しました。');
          }
  
          const geocodeData = await geocodeResponse.json();
          setMarkers(geocodeData);
  
          if (geocodeData.length > 0) {
              setMapCenter(geocodeData[0]);
          }
      } catch (error) {
          console.error('エラーが発生しました:', error);
          setError(error.message);
      }
    };
  
  
  

    useEffect(() => {
        if (markers.length > 1 && window.google && window.google.maps) {
            const directionsService = new window.google.maps.DirectionsService();
            const origin = markers[0];
            const destination = markers[markers.length - 1];
            const waypoints = markers.slice(1, -1).map((m) => ({ location: m }));

            directionsService.route(
                {
                    origin,
                    destination,
                    waypoints,
                    travelMode: window.google.maps.TravelMode.DRIVING,
                },
                (result, status) => {
                    if (status === 'OK') {
                        setDirections(result);
                    } else {
                        console.error('Directions request failed due to ' + status);
                    }
                }
            );
        }
    }, [markers]);

    const handleLogout = () => {
        navigate('/');
    };

    return (
      <div>
          <h1>ホーム画面</h1>
          <p>ようこそ、{username}！</p>
          <PlanForm onSubmit={handlePlanSubmit} />
          {error && <div className="error-message">エラー: {error}</div>}
    
          {plan && (
              <>
                  {/* デバッグ用ログ */}
                  {console.log('planデータ:', plan)}
                  {console.log('plansByDayデータ:', plan
                      .filter((day) => 
                          typeof day === 'string' && day.includes(':') // day が文字列かつ ":" を含む場合のみ処理
                      )
                      .map((day) =>
                          day
                              .split(':')[1] // ": [東京タワー, 浅草寺]" 部分を抽出
                              .replace(/[[]]/g, '') // "[" と "]" を削除
                              .split(',') // カンマで分割
                              .map((place) => place.trim()) // 各場所をトリム
                      )
                  )}
    
                  {/* PlanListコンポーネント */}
                  <PlanList
                      plansByDay={plan
                          .filter((day) =>
                              typeof day === 'string' &&
                              day.includes(':') &&
                              !day.match(/^\s*$/)
                          )
                          .slice(0, duration)
                          .map((day) =>
                              day
                                  .split(':')[1] // ": [東京タワー, 浅草寺]" 部分を抽出
                                  .replace(/[[]]/g, '') // "[" と "]" を削除
                                  .split(',') // カンマで分割
                                  .map((place) => place.trim()) // 各場所をトリム
                          )}
                  />
              </>
          )}
    
          <Map
              googleMapsApiKey={googleMapsApiKey}
              containerStyle={containerStyle}
              mapCenter={mapCenter}
              markers={markers}
              directions={directions}
          />
          <button onClick={handleLogout}>ログアウト</button>
      </div>
    );
    
};

export default Home;
