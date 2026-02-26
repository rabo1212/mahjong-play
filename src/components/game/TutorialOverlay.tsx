'use client';

import { useState, useCallback } from 'react';
import TileComponent from './TileComponent';
import { kindToDisplayId } from '@/lib/tile-utils';

// 패 그룹 렌더링 헬퍼
function Tiles({ kinds, size = 'sm' }: { kinds: number[]; size?: 'xs' | 'sm' | 'md' }) {
  return (
    <div style={{ display: 'flex', gap: '2px', flexWrap: 'wrap' }}>
      {kinds.map((kind, i) => (
        <TileComponent key={i} tileId={kindToDisplayId(kind)} size={size} />
      ))}
    </div>
  );
}

// 구분선 포함 그룹 렌더링
function TileGroups({ groups, size = 'sm' }: { groups: number[][]; size?: 'xs' | 'sm' }) {
  return (
    <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexWrap: 'wrap' }}>
      {groups.map((group, gi) => (
        <div key={gi} style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
          <Tiles kinds={group} size={size} />
          {gi < groups.length - 1 && (
            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '14px', margin: '0 2px' }}>+</span>
          )}
        </div>
      ))}
    </div>
  );
}

// 라벨 + 패 예시
function Example({ label, labelColor, desc, children }: {
  label: string; labelColor?: string; desc?: string; children: React.ReactNode;
}) {
  return (
    <div style={{
      backgroundColor: 'rgba(255,255,255,0.04)',
      borderRadius: '10px',
      padding: '10px 12px',
      border: '1px solid rgba(255,255,255,0.06)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
        <span style={{ fontSize: '13px', fontWeight: 'bold', color: labelColor || '#fff' }}>{label}</span>
        {desc && <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>{desc}</span>}
      </div>
      {children}
    </div>
  );
}

interface TutorialOverlayProps {
  onComplete: () => void;
}

export default function TutorialOverlay({ onComplete }: TutorialOverlayProps) {
  const [step, setStep] = useState(0);
  const totalSteps = 5;
  const isLast = step === totalSteps - 1;

  const goNext = useCallback(() => {
    if (isLast) onComplete();
    else setStep(s => s + 1);
  }, [isLast, onComplete]);

  const goPrev = useCallback(() => {
    setStep(s => Math.max(0, s - 1));
  }, []);

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      {/* 어두운 배경 */}
      <div
        style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.75)',
        }}
        onClick={(e) => e.stopPropagation()}
      />

      {/* 카드 */}
      <div style={{
        position: 'relative',
        width: '92%',
        maxWidth: '440px',
        maxHeight: '85vh',
        overflowY: 'auto',
        backgroundColor: 'rgba(14, 14, 26, 0.97)',
        borderRadius: '18px',
        border: '1px solid rgba(212, 168, 75, 0.35)',
        padding: '20px',
        boxShadow: '0 8px 50px rgba(0,0,0,0.7), 0 0 30px rgba(212,168,75,0.1)',
      }}>
        {/* 진행 바 */}
        <div style={{ display: 'flex', gap: '5px', marginBottom: '16px' }}>
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div key={i} style={{
              flex: 1, height: '5px', borderRadius: '3px',
              backgroundColor: i <= step ? '#d4a84b' : 'rgba(255,255,255,0.08)',
              transition: 'background-color 0.3s',
            }} />
          ))}
        </div>

        {/* 단계별 콘텐츠 */}
        {step === 0 && <Step0_Intro />}
        {step === 1 && <Step1_Tiles />}
        {step === 2 && <Step2_Melds />}
        {step === 3 && <Step3_Actions />}
        {step === 4 && <Step4_Ready />}

        {/* 네비게이션 */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
          {step > 0 && (
            <button onClick={goPrev} style={{
              padding: '11px 18px', borderRadius: '10px', fontSize: '14px',
              fontWeight: 600, cursor: 'pointer',
              backgroundColor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}>
              이전
            </button>
          )}
          <button onClick={goNext} style={{
            flex: 1, padding: '11px 18px', borderRadius: '10px', fontSize: '14px',
            fontWeight: 'bold', cursor: 'pointer',
            backgroundColor: isLast ? '#d4a84b' : 'rgba(212,168,75,0.15)',
            color: isLast ? '#1a1a2e' : '#d4a84b',
            border: isLast ? 'none' : '1px solid rgba(212,168,75,0.25)',
          }}>
            {isLast ? '게임 시작!' : '다음'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Step 0: 게임 소개 ───
function Step0_Intro() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <h2 style={{ fontSize: '22px', fontWeight: 'bold', color: '#d4a84b', margin: 0,
        textShadow: '0 0 16px rgba(212,168,75,0.3)' }}>
        마작이란?
      </h2>
      <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.8)', lineHeight: '1.7', margin: 0 }}>
        4명이 패를 뽑고 버리면서<br/>
        <strong style={{ color: '#d4a84b' }}>특정 조합</strong>을 먼저 완성하면 이기는 게임입니다.
      </p>

      <div style={{
        backgroundColor: 'rgba(212,168,75,0.08)', borderRadius: '12px',
        padding: '14px', border: '1px solid rgba(212,168,75,0.15)',
      }}>
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', margin: '0 0 10px 0' }}>
          이런 조합을 만들면 승리!
        </p>
        <TileGroups groups={[
          [11, 12, 13],   // 1만 2만 3만
          [25, 25, 25],   // 5통 5통 5통
          [31, 32, 33],   // 1삭 2삭 3삭
          [42, 42, 42],   // 남 남 남
          [19, 19],        // 9만 9만
        ]} />
        <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', margin: '8px 0 0 0' }}>
          3장 세트 4개 + 같은 패 2장 = 승리!
        </p>
      </div>

      <div style={{
        backgroundColor: 'rgba(74,222,128,0.08)', borderRadius: '12px',
        padding: '14px', border: '1px solid rgba(74,222,128,0.15)',
      }}>
        <p style={{ fontSize: '13px', fontWeight: 'bold', color: '#4ade80', margin: '0 0 6px 0' }}>
          진행 방식
        </p>
        <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', lineHeight: '1.8' }}>
          1. 13장으로 시작<br/>
          2. 매 턴 1장 뽑기<br/>
          3. 필요 없는 1장 버리기<br/>
          4. 조합 완성하면 승리 선언!
        </div>
      </div>
    </div>
  );
}

// ─── Step 1: 패 종류 ───
function Step1_Tiles() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#d4a84b', margin: 0 }}>
        패 종류
      </h2>
      <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', margin: 0 }}>
        5종류의 패가 있습니다. 각 패는 4장씩!
      </p>

      <Example label="만수" labelColor="#e74c3c" desc="한자 숫자패 (1~9)">
        <Tiles kinds={[11, 12, 13, 14, 15, 16, 17, 18, 19]} size="xs" />
      </Example>

      <Example label="통수" labelColor="#3498db" desc="동그란 점 무늬 (1~9)">
        <Tiles kinds={[21, 22, 23, 24, 25, 26, 27, 28, 29]} size="xs" />
      </Example>

      <Example label="삭수" labelColor="#27ae60" desc="대나무 무늬 (1~9)">
        <Tiles kinds={[31, 32, 33, 34, 35, 36, 37, 38, 39]} size="xs" />
      </Example>

      <div style={{ display: 'flex', gap: '8px' }}>
        <div style={{ flex: 1 }}>
          <Example label="풍패" desc="동남서북">
            <Tiles kinds={[41, 42, 43, 44]} size="xs" />
          </Example>
        </div>
        <div style={{ flex: 1 }}>
          <Example label="삼원패" labelColor="#9b59b6" desc="중·발·백">
            <Tiles kinds={[51, 52, 53]} size="xs" />
          </Example>
        </div>
      </div>
    </div>
  );
}

// ─── Step 2: 조합 (면자) ───
function Step2_Melds() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#d4a84b', margin: 0 }}>
        이기려면? 조합 만들기
      </h2>

      <Example label="순자" labelColor="#3498db" desc="같은 종류 연속 3장">
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <Tiles kinds={[11, 12, 13]} />
          <Tiles kinds={[24, 25, 26]} />
          <Tiles kinds={[37, 38, 39]} />
        </div>
      </Example>

      <Example label="커쯔" labelColor="#e74c3c" desc="같은 패 3장">
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <Tiles kinds={[15, 15, 15]} />
          <Tiles kinds={[51, 51, 51]} />
        </div>
      </Example>

      <Example label="머리" labelColor="#f39c12" desc="같은 패 2장 (1쌍만)">
        <Tiles kinds={[44, 44]} />
      </Example>

      <div style={{
        backgroundColor: 'rgba(212,168,75,0.1)', borderRadius: '12px',
        padding: '14px', border: '1px solid rgba(212,168,75,0.2)',
      }}>
        <p style={{ fontSize: '13px', fontWeight: 'bold', color: '#d4a84b', margin: '0 0 8px 0' }}>
          승리 조건 = 세트 4개 + 머리 1개
        </p>
        <TileGroups groups={[
          [11, 12, 13],
          [21, 22, 23],
          [31, 31, 31],
          [42, 42, 42],
          [19, 19],
        ]} />
        <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
          {['순자', '순자', '커쯔', '커쯔', '머리'].map((label, i) => (
            <span key={i} style={{
              fontSize: '10px', padding: '2px 6px', borderRadius: '4px',
              backgroundColor: i < 4 ? 'rgba(255,255,255,0.08)' : 'rgba(212,168,75,0.15)',
              color: i < 4 ? 'rgba(255,255,255,0.5)' : '#d4a84b',
            }}>{label}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Step 3: 치 / 펑 / 깡 ───
function Step3_Actions() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#d4a84b', margin: 0 }}>
        상대 패 가져오기
      </h2>
      <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', margin: 0 }}>
        상대가 버린 패로 내 조합을 완성할 수 있습니다!
      </p>

      {/* 치 */}
      <div style={{
        backgroundColor: 'rgba(74,159,217,0.08)', borderRadius: '12px',
        padding: '14px', border: '1px solid rgba(74,159,217,0.2)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <span style={{
            fontSize: '16px', fontWeight: 'bold', color: '#4a9fd9',
            backgroundColor: 'rgba(74,159,217,0.2)', padding: '4px 10px', borderRadius: '6px',
          }}>치 (吃)</span>
          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>순자 완성</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>내 패</span>
          <Tiles kinds={[11, 12]} size="sm" />
          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>+</span>
          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>상대 버림</span>
          <div style={{ border: '2px solid #4a9fd9', borderRadius: '4px' }}>
            <TileComponent tileId={kindToDisplayId(13)} size="sm" highlighted />
          </div>
          <span style={{ fontSize: '11px', color: '#4a9fd9' }}>= 순자!</span>
        </div>
      </div>

      {/* 펑 */}
      <div style={{
        backgroundColor: 'rgba(231,76,60,0.08)', borderRadius: '12px',
        padding: '14px', border: '1px solid rgba(231,76,60,0.2)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <span style={{
            fontSize: '16px', fontWeight: 'bold', color: '#e74c3c',
            backgroundColor: 'rgba(231,76,60,0.2)', padding: '4px 10px', borderRadius: '6px',
          }}>펑 (碰)</span>
          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>커쯔 완성</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>내 패</span>
          <Tiles kinds={[25, 25]} size="sm" />
          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>+</span>
          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>상대 버림</span>
          <div style={{ border: '2px solid #e74c3c', borderRadius: '4px' }}>
            <TileComponent tileId={kindToDisplayId(25)} size="sm" highlighted />
          </div>
          <span style={{ fontSize: '11px', color: '#e74c3c' }}>= 커쯔!</span>
        </div>
      </div>

      {/* 깡 */}
      <div style={{
        backgroundColor: 'rgba(155,89,182,0.08)', borderRadius: '12px',
        padding: '14px', border: '1px solid rgba(155,89,182,0.2)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <span style={{
            fontSize: '16px', fontWeight: 'bold', color: '#9b59b6',
            backgroundColor: 'rgba(155,89,182,0.2)', padding: '4px 10px', borderRadius: '6px',
          }}>깡 (槓)</span>
          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>같은 패 4장</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <Tiles kinds={[41, 41, 41, 41]} size="sm" />
          <span style={{ fontSize: '11px', color: '#9b59b6' }}>→ 추가 1장 뽑기!</span>
        </div>
      </div>

      <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', margin: 0 }}>
        버튼이 나타나면 클릭! 필요 없으면 패스를 누르세요.
      </p>
    </div>
  );
}

// ─── Step 4: 준비 완료 ───
function Step4_Ready() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <h2 style={{ fontSize: '22px', fontWeight: 'bold', color: '#d4a84b', margin: 0,
        textShadow: '0 0 16px rgba(212,168,75,0.3)' }}>
        준비 완료!
      </h2>

      <div style={{
        backgroundColor: 'rgba(212,168,75,0.08)', borderRadius: '12px',
        padding: '14px', border: '1px solid rgba(212,168,75,0.15)',
      }}>
        <p style={{ fontSize: '14px', fontWeight: 'bold', color: '#d4a84b', margin: '0 0 10px 0' }}>
          기억할 것 3가지
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
            <span style={{
              width: '24px', height: '24px', borderRadius: '50%',
              backgroundColor: 'rgba(212,168,75,0.2)', color: '#d4a84b',
              fontSize: '12px', fontWeight: 'bold',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>1</span>
            <div>
              <p style={{ fontSize: '13px', color: '#fff', margin: '0 0 4px 0', fontWeight: 600 }}>
                세트 4개 + 머리 1개 = 승리
              </p>
              <TileGroups groups={[[11, 12, 13], [25, 25, 25], [37, 38, 39], [44, 44, 44], [19, 19]]} size="xs" />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
            <span style={{
              width: '24px', height: '24px', borderRadius: '50%',
              backgroundColor: 'rgba(212,168,75,0.2)', color: '#d4a84b',
              fontSize: '12px', fontWeight: 'bold',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>2</span>
            <p style={{ fontSize: '13px', color: '#fff', margin: 0 }}>
              매 턴 <strong style={{ color: '#4ade80' }}>1장 뽑고</strong> → <strong style={{ color: '#e74c3c' }}>1장 버리기</strong>
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
            <span style={{
              width: '24px', height: '24px', borderRadius: '50%',
              backgroundColor: 'rgba(212,168,75,0.2)', color: '#d4a84b',
              fontSize: '12px', fontWeight: 'bold',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>3</span>
            <p style={{ fontSize: '13px', color: '#fff', margin: 0 }}>
              <strong style={{ color: '#4a9fd9' }}>치</strong>·<strong style={{ color: '#e74c3c' }}>펑</strong>·<strong style={{ color: '#9b59b6' }}>깡</strong> 버튼이 나타나면 상대 패를 가져올 수 있음
            </p>
          </div>
        </div>
      </div>

      <div style={{
        backgroundColor: 'rgba(74,222,128,0.08)', borderRadius: '12px',
        padding: '12px', border: '1px solid rgba(74,222,128,0.15)',
      }}>
        <p style={{ fontSize: '13px', color: '#4ade80', margin: 0 }}>
          화면 상단에 실시간 가이드가 표시됩니다.<br/>
          어떤 패를 버려야 하는지 알려드릴게요!
        </p>
      </div>
    </div>
  );
}
