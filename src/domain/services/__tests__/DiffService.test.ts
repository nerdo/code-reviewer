import { DiffService } from '../DiffService';

describe('DiffService', () => {
  let diffService: DiffService;

  beforeEach(() => {
    diffService = new DiffService();
  });

  it('should generate diff for added lines', () => {
    const oldContent = 'line1\nline2';
    const newContent = 'line1\nline2\nline3';
    
    const hunks = diffService.generateDiff(oldContent, newContent);
    
    expect(hunks).toHaveLength(1);
    expect(hunks[0].lines.length).toBeGreaterThan(0);
    const addedLine = hunks[0].lines.find(l => l.type === 'add' && l.content === 'line3');
    expect(addedLine).toBeDefined();
  });

  it('should generate diff for deleted lines', () => {
    const oldContent = 'line1\nline2\nline3';
    const newContent = 'line1\nline3';
    
    const hunks = diffService.generateDiff(oldContent, newContent);
    
    expect(hunks).toHaveLength(1);
    const deleteLine = hunks[0].lines.find(l => l.type === 'delete');
    expect(deleteLine).toBeDefined();
    expect(deleteLine?.content).toBe('line2');
  });

  it('should generate diff for modified lines', () => {
    const oldContent = 'line1\nline2\nline3';
    const newContent = 'line1\nmodified line2\nline3';
    
    const hunks = diffService.generateDiff(oldContent, newContent);
    
    expect(hunks).toHaveLength(1);
    const lines = hunks[0].lines;
    expect(lines.find(l => l.type === 'delete' && l.content === 'line2')).toBeDefined();
    expect(lines.find(l => l.type === 'add' && l.content === 'modified line2')).toBeDefined();
  });

  it('should handle empty files', () => {
    const hunks = diffService.generateDiff('', 'new content');
    
    expect(hunks).toHaveLength(1);
    expect(hunks[0].lines[0].type).toBe('add');
    expect(hunks[0].lines[0].content).toBe('new content');
  });

  it('should generate multiple hunks for separated changes', () => {
    const oldContent = Array.from({ length: 20 }, (_, i) => `line${i + 1}`).join('\n');
    const newContent = oldContent
      .split('\n')
      .map((line, i) => {
        if (i === 2) return 'modified line3';
        if (i === 15) return 'modified line16';
        return line;
      })
      .join('\n');
    
    const hunks = diffService.generateDiff(oldContent, newContent);
    
    expect(hunks.length).toBeGreaterThanOrEqual(2);
  });
});